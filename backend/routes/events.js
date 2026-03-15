const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/events — list upcoming celestial events
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, event_name, event_type, celestial_body, event_date, description
       FROM celestial_events
       ORDER BY event_date ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM celestial_events WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/events — add a celestial event
router.post('/', async (req, res, next) => {
  const { event_name, event_type, celestial_body, event_date, description } = req.body;
  if (!event_name || !event_date) {
    return res.status(400).json({ error: 'event_name and event_date are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO celestial_events (event_name, event_type, celestial_body, event_date, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_name, event_type, celestial_body, event_date, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
