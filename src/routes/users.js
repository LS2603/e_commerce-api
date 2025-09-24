const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, phone, address_line1, address_line2, city, postcode, created_at
     FROM users ORDER BY id`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, phone, address_line1, address_line2, city, postcode, created_at
     FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { email, phone, address_line1, address_line2, city, postcode, password_hash } = req.body;
  if (!email || !password_hash) return res.status(400).json({ error: 'email and password required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, phone, address_line1, address_line2, city, postcode, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, phone, address_line1, address_line2, city, postcode, created_at`,
      [email, phone, address_line1, address_line2, city, postcode, password_hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { email, phone, address_line1, address_line2, city, postcode, password_hash } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET email=$1, phone=$2, address_line1=$3, address_line2=$4, city=$5, postcode=$6,
           password_hash = COALESCE($7, password_hash)
       WHERE id=$8
       RETURNING id, email, phone, address_line1, address_line2, city, postcode, created_at`,
      [email, phone, address_line1, address_line2, city, postcode, password_hash ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id, email', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
