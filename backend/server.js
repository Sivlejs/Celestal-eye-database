require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const usersRouter  = require('./routes/users');
const chartsRouter = require('./routes/charts');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled so inline dashboard scripts work
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Static dashboard ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ────────────────────────────────────────────────────────────────
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

app.listen(PORT, () => {
  console.log(`Celestal Eye backend listening on port ${PORT}`);
});

module.exports = app;
