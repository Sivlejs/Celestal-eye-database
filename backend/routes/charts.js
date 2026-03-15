const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/charts — list all birth charts (with user name)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT bc.id, u.name AS user_name, bc.birth_date, bc.birth_time,
              bc.birth_city, bc.birth_country, bc.sun_sign, bc.moon_sign,
              bc.rising_sign, bc.created_at
       FROM birth_charts bc
       JOIN users u ON u.id = bc.user_id
       ORDER BY bc.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/charts/:id — single chart with readings
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT bc.*, u.name AS user_name, u.email AS user_email
       FROM birth_charts bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Chart not found' });

    const { rows: readings } = await db.query(
      `SELECT id, reading_type, content, generated_at
       FROM chart_readings WHERE birth_chart_id = $1 ORDER BY generated_at DESC`,
      [req.params.id]
    );

    res.json({ ...rows[0], readings });
  } catch (err) {
    next(err);
  }
});

// POST /api/charts — create a birth chart
router.post('/', async (req, res, next) => {
  const {
    user_id, birth_date, birth_time, birth_city, birth_country,
    latitude, longitude, sun_sign, moon_sign, rising_sign, chart_data,
  } = req.body;

  if (!user_id || !birth_date) {
    return res.status(400).json({ error: 'user_id and birth_date are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO birth_charts
         (user_id, birth_date, birth_time, birth_city, birth_country,
          latitude, longitude, sun_sign, moon_sign, rising_sign, chart_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [user_id, birth_date, birth_time, birth_city, birth_country,
       latitude, longitude, sun_sign, moon_sign, rising_sign,
       chart_data ? JSON.stringify(chart_data) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
