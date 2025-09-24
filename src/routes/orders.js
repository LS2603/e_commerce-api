const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM orders ORDER BY id`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
});

module.exports = router;