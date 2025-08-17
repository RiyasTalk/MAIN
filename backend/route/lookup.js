import express from 'express';
import bcrypt from 'bcrypt';
import { get as getDB } from '../config/db.js'; // Adjust path if needed
import { stringify } from 'querystring';

const router = express.Router();

// This route SHOWS the form
router.get('/', (req, res) => {
    res.render('lookup-form');
});

// This route PROCESSES the form
router.post('/', async (req, res) => {
    try {
        const { name, password } = req.body;
        const db = getDB();



        // 1. Find the person by their name
        const person = await db.collection('people').findOne({  personName: String(name) });

        if (!person) {
            return res.render('lookup-form', { error: 'Invalid name or password.' });
        }

        // 2. Compare password (later replace with bcrypt.compare for security)
        const isMatch = String(password) === String(person.password);

        if (isMatch) {
            // 3. Fetch buyout history
            const buyoutHistory = await db.collection('buyouts')
                .find({ personId: person._id })
                .sort({ buyoutDate: -1 })
                .toArray();

            // 4. Render details page
            res.render('investor-details', { 
                person, 
                buyouts: buyoutHistory 
            });
        } else {
            res.render('lookup-form', { error: 'Invalid name or password.' });
        }

    } catch (error) {
        console.error("Error during history lookup:", error);
        res.render('lookup-form', { error: 'An error occurred. Please try again.' });
    }
});


export default router;