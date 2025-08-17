import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import exphbs from 'express-handlebars';
import { connect } from './config/db.js';
import poolRoute from './routes.js/pool.js';
import lookupRouter from './routes.js/lookup.js';

dotenv.config();

// Paths
const __filename = fileURLToPath(import.meta.url);
const backendDir = path.dirname(__filename);
const projectRoot = path.resolve();

const app = express();
const port = process.env.PORT || 5000;

// Serve frontend build
app.use(express.static(path.join(projectRoot, 'frontend', 'dist')));

// Trust reverse proxy (for secure cookies)
app.set('trust proxy', 1);

// Helmet for security headers
app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.API_URL,
  process.env.BACKEND_URL,
  'http://localhost:5173',
  'http://localhost:5000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 days
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// Rate limiting
app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 100 }));

// Handlebars
app.set('views', path.join(backendDir, 'views'));
app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: null,
  partialsDir: path.join(backendDir, 'views/partials/'),
}));
app.set('view engine', 'hbs');

// Static public files
app.use(express.static(path.join(backendDir, 'public')));

// Routes
app.use('/api/pool', poolRoute);
app.use('/lookup', lookupRouter);

// Catch-all: React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'frontend', 'dist', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Unexpected error!' });
});

// Start server
connect(err => {
  if (err) {
    console.log('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});
