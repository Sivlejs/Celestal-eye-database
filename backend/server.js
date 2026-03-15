require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./db');
const authRouter   = require('./routes/auth');
const usersRouter  = require('./routes/users');
const chartsRouter = require('./routes/charts');
const eventsRouter = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate limiting (covers all routes, including the dashboard) ───────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS to a comma-separated list of your app's origins, e.g.:
//   https://celestal-eye.app,https://www.celestal-eye.app
// If unset every origin is allowed (handy for local dev and mobile clients).
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, cb) => {
    // No origin = mobile app / curl / server-to-server → always allow
    if (!origin) return cb(null, true);
    if (!allowedOrigins.length || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Security & parsing middleware ─────────────────────────────────────────────
// CSP allows only same-origin resources (dashboard JS/CSS are external files)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'"],
      connectSrc:  ["'self'"],
      imgSrc:      ["'self'", 'data:'],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Per-route API rate limit (stricter than the global one) ──────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Static dashboard ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/users',  usersRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/events', eventsRouter);

// ── Health check (required by Render) ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Dashboard catch-all ───────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start: wait for DB then listen ───────────────────────────────────────────
db.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Celestal Eye backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });

module.exports = app;

