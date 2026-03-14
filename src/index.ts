import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import playersRouter from "./routes/players";
import feedbackRouter from "./routes/feedback";
import adminRouter from "./routes/admin";
import hintsRouter from "./routes/hints";
import playerManagementRouter from "./routes/playerManagement";
import hardCellsRouter from "./routes/hardCells";
import hardGridRulesRouter from "./routes/hardGridRules";
import { adminAuth } from "./middleware/adminAuth";

const app = express();
const PORT = process.env.PORT || 5001;

// 1. HELMET: Basic security headers
app.use(helmet());

// 2. RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// 3. SECURE CORS
// Added localhost:5173 and 127.0.0.1 just in case Vite or Docker uses them
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://3.108.62.16:3000" // Update this later
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) in development
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by Security (CORS)'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));

// Routes
app.use("/api/players", playersRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/admin", adminAuth, adminRouter);
app.use("/api/player-management", adminAuth, playerManagementRouter);
app.use("/api/hints", hintsRouter);

// Fix: Make sure these don't conflict with other /api routes
app.use("/api", hardCellsRouter);
app.use("/api", hardGridRulesRouter);

app.get("/", (req, res) => {
  res.json({ status: "Server is secure and running" });
});

// IMPORTANT: Binding to '0.0.0.0' is required for Docker to work!
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Secure Server running on port ${PORT}`);
});

// Clean Shutdown
const shutdown = () => {
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
