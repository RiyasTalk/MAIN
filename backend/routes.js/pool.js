import express from 'express';
import { ObjectId } from 'mongodb';
import { get as getDB } from '../config/db.js';
import bcrypt from 'bcrypt';
const router = express.Router();


// HELPER to check for valid MongoDB ObjectId
const isValidObjectId = (id) => {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
};
// This function checks if a user is logged in
const secureRoute = (req, res, next) => {
    if (req.session.user) {
        // If a user is found in the session, proceed to the next function (the route handler)
        next();
    } else {
        // If no user is in the session, block the request with a 401 Unauthorized error
        res.status(401).send({ success: false, error: "Unauthorized. Please log in." });
    }
};
// NEW: Helper function to get the current investment status of a pool
const getPoolInvestmentStatus = async (db, poolId) => {
    const pool = await db.collection('pools').findOne({ _id: new ObjectId(poolId) });
    if (!pool) {
        throw new Error('Pool not found.');
    }

    const people = await db.collection('people').find({ poolId: new ObjectId(poolId) }).toArray();
    const totalInvestedByPeople = people.reduce((sum, person) => sum + person.amount, 0);
    const adminShare = pool.adminShare || 0;
    const totalInvestment = totalInvestedByPeople + adminShare;
    const remainingAmount = pool.totalAmount - totalInvestment;

    return { pool, totalInvestment, remainingAmount };
};

router.post('/login', async (req, res) => {
    console.log("reached here");
    
    const { name, password } = req.body;
    console.log("Login attempt with name:", name);
    // Basic validation
    console.log(password,"length");
    
    
    if (!name || !password) {
        return res.status(400).send({ success: false, error: "Name and password are required." });
    }

    try {
        const db = getDB();
        const user = await db.collection('userauth').findOne({ name: name });

        // 1. Check if user exists
        if (!user) {
            return res.status(401).send({ success: false, error: "Invalid credentials." });
        }

        // 2. Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // 3. If passwords match, create a session for the user
            req.session.user = {
                id: user._id,
                name: user.name,
            };
            console.log("User logged in:", req.session.user);
            
            return res.status(200).send({ success: true, message: "Login successful.", user:req.session.user });
        } else {
            return res.status(401).send({ success: false, error: "Invalid credentials." });
        }

    } catch (error) {
        res.status(500).send({ success: false, error: "Server error during login." });
    }
});
// Get all pools
router.get('/',secureRoute, async (req, res) => {
    try {
        const db = getDB();
        const pools = await db.collection('pools').find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).send({ success: true, pools });
    } catch (error) {
        console.error("Error fetching all pools:", error);
        res.status(500).send({ success: false, error: "Internal server error." });
    }
});

// Create a pool
router.post('/create', async (req, res) => {
    const { name, totalAmount, adminShare } = req.body;

    if (!name || !totalAmount) {
        return res.status(400).send({ success: false, error: '`name` and `totalAmount` are required.' });
    }
    if (typeof totalAmount !== 'number' || (adminShare && typeof adminShare !== 'number')) {
        return res.status(400).send({ success: false, error: '`totalAmount` and `adminShare` must be numbers.' });
    }

    try {
        const db = getDB();
        const pool = {
            name,
            totalAmount,
            adminShare: adminShare || 0,
              initialAdminAmount: adminShare || 0,
            createdAt: new Date()
        };

        const result = await db.collection('pools').insertOne(pool);
        res.status(201).send({ success: true, message: 'Pool created successfully.', poolId: result.insertedId });
    } catch (error) {
        console.error("Error creating pool:", error);
        res.status(500).send({ success: false, error: "Internal server error." });
    }
});

// Add a person to a pool
router.post('/add-person', secureRoute, async (req, res) => {
    // Get all fields from the request body
    const { poolId, personName, amount, mobileNumber, address } = req.body;

    // --- Input Validation ---
    if (!poolId || !personName || !amount || !address) { // Added 'address' (password) to required fields
        return res.status(400).send({ success: false, error: 'All fields including address (as password) are required.' });
    }
    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ success: false, error: '`amount` must be a positive number.' });
    }

    try {
        const db = getDB();
        
        const { remainingAmount } = await getPoolInvestmentStatus(db, poolId);

        if (amount > remainingAmount) {
            return res.status(400).send({ 
                success: false, 
                error: `Investment exceeds pool capacity. Only $${remainingAmount.toFixed(2)} is remaining.` 
            });
        }
        
        // --- 1. HASH THE PASSWORD ---
        // Securely hash the 'address' field before saving. 10 is the salt rounds.
        const hashedPassword = await bcrypt.hash(address, 10);

        // --- 2. Build the person object with the HASHED password ---
        const person = {
            poolId: new ObjectId(poolId),
            personName,
            amount: amount,
            initialAmount: amount,
            createdAt: new Date(),
            password: hashedPassword // Save the secure hash, not the plain text
        };

        // Add optional fields only if they exist
        if (mobileNumber) {
            person.mobileNumber = mobileNumber;
        }
        
        // --- Insert into Database ---
        await db.collection('people').insertOne(person);
        res.status(201).send({ success: true, message: 'Person added to pool successfully.' });
    } catch (error) {
        console.error("Error adding person:", error);
        res.status(500).send({ success: false, error: error.message || "Internal server error." });
    }
});
// Admin adds more shares to a pool
router.post('/admin/add-shares',secureRoute, async (req, res) => {
    const { poolId, extraAmount } = req.body;

    if (!poolId || !extraAmount) {
        return res.status(400).send({ success: false, error: '`poolId` and `extraAmount` are required.' });
    }
    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }
    if (typeof extraAmount !== 'number' || extraAmount <= 0) {
        return res.status(400).send({ success: false, error: '`extraAmount` must be a positive number.' });
    }

    try {
        const db = getDB();

        // --- CHANGED: Validate against over-investment ---
        const { remainingAmount } = await getPoolInvestmentStatus(db, poolId);

        if (extraAmount > remainingAmount) {
            return res.status(400).send({ 
                success: false, 
                error: `Investment exceeds pool capacity. Only $${remainingAmount.toFixed(2)} is remaining.` 
            });
        }
        
        await db.collection('pools').updateOne(
            { _id: new ObjectId(poolId) },
            { $inc: { adminShare: extraAmount } }
        );
        res.status(200).send({ success: true, message: 'Admin share updated successfully.' });
    } catch (error) {
        console.error("Error updating admin shares:", error);
        res.status(500).send({ success: false, error: error.message || "Internal server error." });
    }
});
// In your backend auth router file

// Checks if a user is currently logged in via session
router.get('/status', (req, res) => {
    if (req.session.user) {
        res.status(200).send({ success: true, user: req.session.user });
    } else {
        res.status(200).send({ success: false, user: null });
    }
});

// Logs the user out
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send({ success: false, error: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.status(200).send({ success: true, message: 'Logged out successfully.' });
    });
});

// --- NEW: Admin buys out an investor's share ---
router.post('/admin/buyout',secureRoute, async (req, res) => {
    const { poolId, personId, buyoutAmount } = req.body;

    // --- Basic Input Validation ---
    if (!isValidObjectId(poolId) || !isValidObjectId(personId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID or Person ID format.' });
    }
    if (typeof buyoutAmount !== 'number' || buyoutAmount <= 0) {
        return res.status(400).send({ success: false, error: 'Buyout amount must be a positive number.' });
    }

    const db = getDB();

    try {
        // --- Pre-Operation Validation ---
        // Find the person first to validate the request.
        const person = await db.collection('people').findOne(
            { _id: new ObjectId(personId), poolId: new ObjectId(poolId) }
        );

        // If the person doesn't exist, send a 404 Not Found error.
        if (!person) {
            return res.status(404).send({ success: false, error: "Person not found in the specified pool." });
        }
        
        // If the buyout amount is greater than what the person owns, send a 400 Bad Request error.
        if (buyoutAmount > person.amount) {
            return res.status(400).send({ 
                success: false, 
                error: `Buyout amount of $${buyoutAmount} exceeds the person's current investment of $${person.amount}.` 
            });
        }

        // --- Sequential Database Writes (No Transaction) ---
        // These operations will now run one after another.

        // 1. Decrease person's investment by the buyoutAmount
        await db.collection('people').updateOne(
            { _id: new ObjectId(personId) },
            { $inc: { amount: -buyoutAmount } }
        );

        // 2. Add the buyoutAmount to the admin's share in the pool
        await db.collection('pools').updateOne(
            { _id: new ObjectId(poolId) },
            { $inc: { adminShare: buyoutAmount } }
        );

        // 3. Log the specific buyout transaction for auditing
        const buyoutResult = await db.collection('buyouts').insertOne({
            poolId: new ObjectId(poolId),
            personId: new ObjectId(personId),
            personName: person.personName,
            amount: buyoutAmount,
            buyoutDate: new Date()
        });

        // If all operations were successful, send a success response.
        res.status(200).send({ success: true, message: "Buyout successful.", transactionId: buyoutResult.insertedId });
        
    } catch (error) {
        // This will catch any errors that occur during the database operations.
        console.error("Error during buyout operation:", error);
        res.status(500).send({ success: false, error: "A server error occurred during the buyout." });
    }
});


// Get a detailed summary of a pool
router.get('/:poolId/summary', secureRoute,async (req, res) => {
    const { poolId } = req.params;

    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }

    try {
        const db = getDB();
        
        // --- CHANGED: Use the helper to get initial data ---
        const { pool, totalInvestment, remainingAmount } = await getPoolInvestmentStatus(db, poolId);
const poolinitialAdminFund = await db.collection('pools').findOne({ _id: new ObjectId(poolId) });
const initialFund = poolinitialAdminFund?.initialAdminAmount ?? 0;


        const people = await db.collection('people').find({ poolId: new ObjectId(poolId) }).toArray();
        // --- NEW: Fetch buyout history ---
        const buyoutHistory = await db.collection('buyouts').find({ poolId: new ObjectId(poolId) }).toArray();


        const calculatePercentage = (amount, total) => {
            if (total === 0) return 0;
            return parseFloat(((amount / total) * 100).toFixed(2));
        };

        const peopleWithShares = people.map(person => ({
            ...person,
            sharePercentage: calculatePercentage(person.amount, pool.totalAmount)
        }));

        const adminSharePercentage = calculatePercentage(pool.adminShare, pool.totalAmount);

        const summary = {
            poolDetails: {
                _id: pool._id,
                name: pool.name,
                totalAmount: pool.totalAmount,
                createdAt: pool.createdAt,
                initialFund : initialFund
            },
            investmentStatus: {
                totalInvestment,
                remainingAmount,
                isFunded: totalInvestment >= pool.totalAmount
            },
            adminContribution: {
                amount: pool.adminShare,
                sharePercentage: adminSharePercentage
            },
            investors: peopleWithShares.filter(p => p.amount > 0), // Only show active investors
            investorCount: people.filter(p => p.amount > 0).length,
            buyoutHistory: buyoutHistory, // --- NEW ---
          
        };

        res.status(200).send({ success: true, summary });

    } catch (error) {
        console.error("Error fetching pool summary:", error);
        res.status(500).send({ success: false, error: error.message || "Internal server error." });
    }
});
// Add this route to your existing routes/pools.js file

// ... (other routes like /admin/buyout) ...

// NEW: Calculate profit distribution for a pool
router.post('/:poolId/calculate-profit', secureRoute,async (req, res) => {
    const { poolId } = req.params;
    const { profitAmount } = req.body;

    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }
    if (typeof profitAmount !== 'number' || profitAmount < 0) {
        return res.status(400).send({ success: false, error: 'Profit amount must be a positive number.' });
    }

    try {
        const db = getDB();
        
        // 1. Get pool details (for admin share)
        const pool = await db.collection('pools').findOne({ _id: new ObjectId(poolId) });
        if (!pool) {
            return res.status(404).send({ success: false, error: 'Pool not found.' });
        }

        // 2. Get all investors for the pool
        const people = await db.collection('people').find({ poolId: new ObjectId(poolId) }).toArray();

        // 3. Calculate the total amount currently invested in the pool
        const totalInvestedByPeople = people.reduce((sum, person) => sum + person.amount, 0);
        const adminShare = pool.adminShare || 0;
        const totalInvestment = totalInvestedByPeople + adminShare;

        if (totalInvestment === 0) {
            return res.status(400).send({ success: false, error: 'Cannot distribute profit on a pool with zero investment.' });
        }

        // 4. Build the distribution list based on each participant's percentage share
        const distribution = [];

        // Calculate and add the admin's share to the list (if they have one)
        if (adminShare > 0) {
            const adminPercentage = (adminShare / totalInvestment);
            distribution.push({
                participantId: 'admin',
                name: 'Admin',
                investment: adminShare,
                sharePercentage: adminPercentage * 100,
                profitShare: profitAmount * adminPercentage
            });
        }

        // Calculate and add each investor's share to the list
        people.forEach(person => {
            if (person.amount > 0) {
                const personPercentage = (person.amount / totalInvestment);
                distribution.push({
                    participantId: person._id,
                    name: person.personName,
                    investment: person.amount,
                    sharePercentage: personPercentage * 100,
                    profitShare: profitAmount * personPercentage
                });
            }
        });

        // 5. Send the calculated distribution back to the client
        res.status(200).send({ success: true, distribution });

    } catch (error) {
        console.error("Error calculating profit distribution:", error);
        res.status(500).send({ success: false, error: "An internal server error occurred." });
    }
});

// Add this new route to your existing routes/pools.js file

// NEW: Get all people/investors for a specific pool
// In your backend router file (e.g., routes/mainRouter.js)

// ... (your other routes)

// GET all investors for a specific pool
router.get('/:poolId/investordetails', secureRoute, async (req, res) => {
    const { poolId } = req.params;

    // Validate the Pool ID
    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }

    try {
        const db = getDB();
        
        // Find all documents in the 'people' collection that match the poolId
        const investors = await db.collection('people')
            .find({ poolId: new ObjectId(poolId) })
            .sort({ createdAt: 1 }) // Optional: sort by creation date
            .toArray();

        res.status(200).send({ success: true, data: investors });

    } catch (error) {
        console.error("Error fetching investor details:", error);
        res.status(500).send({ success: false, error: "Internal server error." });
    }
});

// ... (rest of your routes)
export default router;