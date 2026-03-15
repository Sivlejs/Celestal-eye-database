const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/charts
//   • App (Bearer token): returns only the authenticated user's charts
//   • Dashboard (no token): returns all charts
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const base = `
      SELECT bc.id, u.name AS user_name, bc.birth_date, bc.birth_time,
             bc.birth_city, bc.birth_country, bc.sun_sign, bc.moon_sign,
             bc.rising_sign, bc.created_at
      FROM birth_charts bc
      JOIN users u ON u.id = bc.user_id`;

    let rows;
    if (req.user) {
      ({ rows } = await db.query(
        `${base} WHERE bc.user_id = $1 ORDER BY bc.created_at DESC`,
        [req.user.id]
      ));
    } else {
      ({ rows } = await db.query(`${base} ORDER BY bc.created_at DESC`));
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/charts/:id — single chart with readings
//   • App: verifies ownership
//   • Dashboard: open access
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT bc.*, u.name AS user_name, u.email AS user_email
       FROM birth_charts bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Chart not found' });

    const chart = rows[0];
    if (req.user && chart.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: readings } = await db.query(
      `SELECT id, reading_type, content, generated_at
       FROM chart_readings WHERE birth_chart_id = $1 ORDER BY generated_at DESC`,
      [req.params.id]
    );

    res.json({ ...chart, readings });
  } catch (err) {
    next(err);
  }
});

// POST /api/charts — create a birth chart (app must be authenticated)
//   user_id is taken from the JWT — the body value is ignored.
router.post('/', requireAuth, async (req, res, next) => {
  const {
    birth_date, birth_time, birth_city, birth_country,
    latitude, longitude, sun_sign, moon_sign, rising_sign, chart_data,
  } = req.body;

  if (!birth_date) {
    return res.status(400).json({ error: 'birth_date is required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO birth_charts
         (user_id, birth_date, birth_time, birth_city, birth_country,
          latitude, longitude, sun_sign, moon_sign, rising_sign, chart_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, birth_date, birth_time, birth_city, birth_country,
       latitude, longitude, sun_sign, moon_sign, rising_sign,
       chart_data ? JSON.stringify(chart_data) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/charts/:id/readings — add a reading to a chart (app only)
router.post('/:id/readings', requireAuth, async (req, res, next) => {
  const { reading_type, content } = req.body;
  if (!reading_type || !content) {
    return res.status(400).json({ error: 'reading_type and content are required' });
  }
  try {
    // Verify the chart belongs to this user
    const { rows: chartRows } = await db.query(
      'SELECT id FROM birth_charts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!chartRows.length) {
      return res.status(404).json({ error: 'Chart not found or access denied' });
    }

    const { rows } = await db.query(
      `INSERT INTO chart_readings (birth_chart_id, reading_type, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, reading_type, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/charts/:id/readings — list readings for a chart
router.get('/:id/readings', optionalAuth, async (req, res, next) => {
  try {
    const { rows: chartRows } = await db.query(
      'SELECT id, user_id FROM birth_charts WHERE id = $1',
      [req.params.id]
    );
    if (!chartRows.length) return res.status(404).json({ error: 'Chart not found' });

    if (req.user && chartRows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `SELECT id, reading_type, content, generated_at
       FROM chart_readings WHERE birth_chart_id = $1 ORDER BY generated_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
