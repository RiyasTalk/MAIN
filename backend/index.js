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

// Define the list of allowed origins
const allowedOrigins = [
  process.env.API_URL,       // Your deployed frontend from .env on Render
  'http://localhost:5173'    // Your local development server
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests if the origin is in our list or if there's no origin (like with Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // This allows cookies to be sent
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.set('trust proxy', 1);
// 2. Parsers for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Use 'false' for simple forms

// 3. Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // secure = true only in production (HTTPS)
        httpOnly: true,
        sameSite:'none', // Allow cross-site cookies if in prod
        maxAge: 1000 * 60 * 60 * 24
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