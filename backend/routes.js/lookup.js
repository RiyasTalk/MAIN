import express from 'express';
import bcrypt from 'bcrypt';
import { get as getDB } from '../config/db.js'; // Adjust path if needed

const router = express.Router();

// This route SHOWS the form
router.get('/', (req, res) => {
    res.render('lookup-form');
});

// This route PROCESSES the form
router.post('/', async (req, res) => {
    try {
        const { name, password } = req.body;
        const personName=name
        const db = getDB();
console.log(`Looking up person: ${personName}`); // Debug log
        console.log(`Using password: ${password}`); // Debug log

        // 1. Find the person by their name in the 'people' collection
        const person = await db.collection('people').findOne({ personName: personName });

        // If no user is found, send a generic error for security
        if (!person) {
            return res.render('lookup-form', { error: 'Invalid name or password.' });
        }

        // 2. Compare the submitted password with the HASHED password in the database
        const isMatch = await bcrypt.compare(password, person.password);

        if (isMatch) {
            // 3. If passwords match, find all their transactions from the 'buyouts' collection
            const buyoutHistory = await db.collection('buyouts')
                .find({ personId: person._id })
                .sort({ buyoutDate: -1 }) // Show most recent first
                .toArray();

            // 4. Render the details page with the person's info AND their buyout history
            res.render('investor-details', { 
                person: person, 
                buyouts: buyoutHistory 
            });
        } else {
            // If passwords do NOT match, show the same generic error for security
            res.render('lookup-form', { error: 'Invalid name or password.' });
        }

    } catch (error) {
        console.error("Error during history lookup:", error);
        res.render('lookup-form', { error: 'An error occurred. Please try again.' });
    }
});

export default router;