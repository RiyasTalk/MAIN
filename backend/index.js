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
import poolRoute from './route/pool.js';
import lookupRouter from './route/lookup.js';

// Load environment variables from .env file
dotenv.config();

// --- ES Module Fix for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// --- CRITICAL PRODUCTION SETTINGS ---
app.set('trust proxy', 1);

// --- MIDDLEWARE CONFIGURATION ---
app.use(helmet());
const allowedOrigins = [
    process.env.API_URL,
    process.env.BACKEND_URL,
    'http://localhost:5173',
    'http://localhost:5000'
];
const corsOptions = {
    origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin === 'null') {
        callback(null, true);
    } else {
        console.error("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
    }
},
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions',
            ttl: 1 * 24 * 60 * 60,
        }),
        cookie: {
            secure: true,
            httpOnly: false,
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);
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
app.use(express.static(path.join(__dirname, 'public')));


// --- ROUTES ---
app.use('/api/pool', poolRoute);
app.use('/lookup', lookupRouter);


// --- SERVE REACT FRONTEND ---
// The following two lines must be placed AFTER all other API routes.
const projectRoot = path.resolve(__dirname, '..');
const reactDistPath = path.join(projectRoot, 'frontend', 'vite-project', 'dist');

// Serve static assets from the React build directory
app.use(express.static(reactDistPath));

// For all other GET requests, serve the index.html file
app.get(/^(?!\/api|\/lookup).*/, (req, res) => {
    res.sendFile(path.join(projectRoot, 'frontend', 'dist', 'index.html'));
});
// --- CENTRALIZED ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'An unexpected error occurred!' });
});

// --- START SERVER ---
connect((err) => {
    if (err) {
        console.log('❌ Failed to connect to MongoDB:', err);
        process.exit(1);
    } else {
        console.log('✅ Connected to MongoDB successfully');
        app.listen(port, () => {
            console.log(`🚀 Server started on port ${port}`);
        });
    }
});