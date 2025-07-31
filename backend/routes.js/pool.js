import express from 'express';
import { ObjectId } from 'mongodb';
import { get as getDB } from '../config/db.js';

const router = express.Router();

// HELPER to check for valid MongoDB ObjectId
const isValidObjectId = (id) => {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
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


// Get all pools
router.get('/', async (req, res) => {
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
router.post('/add-person', async (req, res) => {
    const { poolId, personName, amount } = req.body;

    if (!poolId || !personName || !amount) {
        return res.status(400).send({ success: false, error: '`poolId`, `personName`, and `amount` are required.' });
    }
    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).send({ success: false, error: '`amount` must be a positive number.' });
    }

    try {
        const db = getDB();
        
        // --- CHANGED: Validate against over-investment ---
        const { remainingAmount } = await getPoolInvestmentStatus(db, poolId);

        if (amount > remainingAmount) {
            return res.status(400).send({ 
                success: false, 
                error: `Investment exceeds pool capacity. Only $${remainingAmount.toFixed(2)} is remaining.` 
            });
        }
        
        const person = {
            poolId: new ObjectId(poolId),
            personName,
            amount,
            createdAt: new Date()
        };

        await db.collection('people').insertOne(person);
        res.status(201).send({ success: true, message: 'Person added to pool successfully.' });
    } catch (error) {
        console.error("Error adding person:", error);
        res.status(500).send({ success: false, error: error.message || "Internal server error." });
    }
});

// Admin adds more shares to a pool
router.post('/admin/add-shares', async (req, res) => {
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


// --- NEW: Admin buys out an investor's share ---
router.post('/admin/buyout', async (req, res) => {
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
router.get('/:poolId/summary', async (req, res) => {
    const { poolId } = req.params;

    if (!isValidObjectId(poolId)) {
        return res.status(400).send({ success: false, error: 'Invalid Pool ID format.' });
    }

    try {
        const db = getDB();
        
        // --- CHANGED: Use the helper to get initial data ---
        const { pool, totalInvestment, remainingAmount } = await getPoolInvestmentStatus(db, poolId);
        
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
                createdAt: pool.createdAt
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
            buyoutHistory: buyoutHistory // --- NEW ---
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
router.post('/:poolId/calculate-profit', async (req, res) => {
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


export default router;