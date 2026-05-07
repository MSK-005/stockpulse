import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import stockRoutes from './routes/stockRoutes.js';
import userRoutes from './routes/userRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import { startCronJobs } from './services/scheduler.js';

// Trigger DB connection on startup
import './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// Stricter limiter for auth routes: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgot-password', authLimiter);

app.use('/api/stocks', stockRoutes);
app.use('/api/users', userRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 StockPulse API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);

  if (process.env.NODE_ENV === 'production') {
    startCronJobs();
  }
});

export default app;
