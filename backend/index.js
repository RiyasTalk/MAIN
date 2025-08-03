// backend/app.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';

// These three are needed for Handlebars and __dirname
import path from 'path';
import { fileURLToPath } from 'url';
import exphbs from 'express-handlebars';

import { connect } from './config/db.js';
import poolRoute from './routes.js/pool.js';
import lookupRouter from './routes.js/lookup.js';

// Load environment variables from .env file
dotenv.config();

// --- ES Module Fix for __dirname ---
// This must be at the top level of your file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// --- MIDDLEWARE CONFIGURATION ---

// 1. CORS: This should come first
const corsOptions = {
  origin: process.env.API_URL ,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 2. Parsers for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Use 'false' for simple forms
app.set('trust proxy', 1);
// 3. Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET, // Use a specific variable for the session secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// 4. Handlebars View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', exphbs.engine({
  helpers: {
     formatDate: (date) => {
            // This function takes a date and makes it readable
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })},
    formatCurrency: function (value) {
      if (typeof value !== 'number') return value;
      return `₹${value.toLocaleString('en-IN')}`; // Indian format
    }
  },
  extname: 'hbs',
  defaultLayout: null,
  partialsDir: path.join(__dirname, 'views/partials/')
}));

app.set('view engine', 'hbs');

// 5. Static Files (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));


// --- ROUTES ---
// API routes for your React frontend
app.use('/api/pool', poolRoute); 
// Server-rendered routes for your Handlebars pages
app.use('/lookup', lookupRouter);


// --- START SERVER ---
connect((err) => {
  if (err) {
    console.log("❌ Failed to connect to MongoDB:", err);
  } else {
    console.log("✅ Connected to MongoDB successfully");
    app.listen(port, () => {
      console.log(`🚀 Server started at http://localhost:${port}`);
    });
  }
});