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

  const order = rows[0]

  const { rows: items } = await pool.query(
    `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.id`,
    [order.id]
  )

  res.json({ ...order, items });
});

router.post('/', async (req, res) => {
  const { user_id, items } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user id is required' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'no items on order' });
  }

const productIds = items.map(i => i.product_id);

const { rows: products } = await pool.query(
  'SELECT id, price FROM products WHERE id = ANY($1::int[])',
  [productIds]
);

if (products.length !== productIds.length) {
  return res.status(400).json({ error: 'one or more products not found' });
}

let total = 0;
items.forEach(it => {
  const product = products.find(p => p.id === it.product_id);
  total += Number(product.price) * it.quantity;
});

const { rows: orderRows } = await pool.query(
  `INSERT INTO orders (user_id, total, status)
   VALUES ($1, $2, 'pending')
   RETURNING id, user_id, total, status, created_at`,
  [user_id, total]
);
const order = orderRows[0];

for (const it of items) {
  const product = products.find(p => p.id === it.product_id);
  await pool.query(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
     VALUES ($1, $2, $3, $4)`,
    [order.id, it.product_id, it.quantity, product.price]
  );
}

  res.status(201).json({ ...order, items });
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0])
});

router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) res.status(400).json({ error: 'status is needed '});

  const { rows } = await pool.query (
    `UPDATE orders
    SET status = $1
    WHERE id = $2
    RETURNING id, user_id total, status, created_at`,
    [status, req.params.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Order not found'});
  res.json(rows[0]);
})

module.exports = router;