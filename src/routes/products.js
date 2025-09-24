const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const { name, description, price, stock } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO products (name, description, price, stock) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, description, price, stock]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, description, price, stock } = req.body;
  if (!name || price < 0 || stock < 0) return res.status(400).json({ error: 'Invalid input' });
  const { rows } = await pool.query(
    'UPDATE products SET name=$1, description=$2, price=$3, stock=$4 WHERE id=$5 RETURNING *',
    [name, description, price, stock, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING *', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

module.exports = router;