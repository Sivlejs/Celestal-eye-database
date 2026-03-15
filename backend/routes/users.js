const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users — list all users
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — get a single user with their charts
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const { rows: charts } = await db.query(
      `SELECT id, birth_date, birth_time, birth_city, birth_country,
              sun_sign, moon_sign, rising_sign, created_at
       FROM birth_charts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ ...rows[0], birth_charts: charts });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create a user
router.post('/', async (req, res, next) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    next(err);
  }
});

module.exports = router;
