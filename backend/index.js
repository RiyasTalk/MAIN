// backend/app.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// These three are needed for Handlebars and __dirname
import path from 'path';
import { fileURLToPath } from 'url';
import exphbs from 'express-handlebars';

import { connect } from './config/db.js';
import poolRoute from './routes/pool.js';
import lookupRouter from './routes/lookup.js';

// Load environment variables from .env file
dotenv.config();

// --- ES Module Fix for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// --- CRITICAL PRODUCTION SETTINGS ---

// Trust the reverse proxy on Render (essential for secure cookies)
app.set('trust proxy', 1);

// --- MIDDLEWARE CONFIGURATION ---

// 1. Security Headers with Helmet
app.use(helmet());

// 2. Robust CORS for both React Frontend and HBS Pages
const allowedOrigins = [
    process.env.API_URL,        // Your React Frontend URL
    process.env.BACKEND_URL,    // Your Backend's own URL (for HBS)
    'http://localhost:5173',    // Your local dev environment
    'http://localhost:5000'     // Your local backend URL
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 3. Parsers for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 4. Session Middleware with Persistent MongoStore
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions',
            ttl: 14 * 24 * 60 * 60, // 14 days
        }),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        },
    })
);

// 5. Rate Limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window (for API routes)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter); // Apply limiter only to API routes

// 6. Handlebars View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.engine(
    'hbs',
    exphbs.engine({
        helpers: {
            formatDate: (date) =>
                new Date(date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            formatCurrency: function (value) {
                if (typeof value !== 'number') return value;
                return `₹${value.toLocaleString('en-IN')}`;
            },
        },
        extname: 'hbs',
        defaultLayout: null,
        partialsDir: path.join(__dirname, 'views/partials/'),
    })
);
app.set('view engine', 'hbs');

// 7. Static Files (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---
app.use('/api/pool', poolRoute);
app.use('/lookup', lookupRouter);

// --- CENTRALIZED ERROR HANDLING ---
// This must be the LAST middleware.
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'An unexpected error occurred!' });
});

// --- START SERVER ---
connect((err) => {
    if (err) {
        console.log('❌ Failed to connect to MongoDB:', err);
        process.exit(1); // Exit process on critical connection failure
    } else {
        console.log('✅ Connected to MongoDB successfully');
        app.listen(port, () => {
            console.log(`🚀 Server started on port ${port}`);
        });
    }
});