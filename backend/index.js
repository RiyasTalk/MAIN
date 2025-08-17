// backend/app.js
import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";

import { connect } from "./config/db.js";
import poolRoute from "./route/pool.js";
import lookupRouter from "./route/lookup.js";

// --- ENV CONFIG ---
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// --- SECURITY / MIDDLEWARE ---
app.set("trust proxy", 1); // required on Render for secure cookies
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- SESSION ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      secure: true, // cookie only sent via HTTPS
      httpOnly: true, // prevents JS access to cookies
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// --- RATE LIMITING ---
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- HANDLEBARS VIEW ENGINE ---
app.set("views", path.join(__dirname, "views"));
app.engine(
  "hbs",
  exphbs.engine({
    helpers: {
      formatDate: (date) =>
        new Date(date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      formatCurrency: (value) =>
        typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : value,
    },
    extname: "hbs",
    defaultLayout: null,
    partialsDir: path.join(__dirname, "views/partials/"),
  })
);
app.set("view engine", "hbs");

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, "public")));

// --- API ROUTES ---
app.use("/api/pool", poolRoute);
app.use("/lookup", lookupRouter);

// --- SERVE REACT FRONTEND (must be after APIs) ---
const reactDistPath = path.join(__dirname, "../frontend/vite-project/dist");
app.use(express.static(reactDistPath));

app.get(/^\/(?!api|lookup).*/, (req, res) => {
  res.sendFile(path.join(reactDistPath, "index.html"));
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ success: false, message: "An unexpected error occurred!" });
});

// --- START SERVER ---
connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  } else {
    console.log("✅ Connected to MongoDB successfully");
    app.listen(port, () => {
      console.log(`🚀 Server started on port ${port}`);
    });
  }
});
