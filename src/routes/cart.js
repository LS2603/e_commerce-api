const express = require ('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM carts ORDER BY id`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM carts WHERE id = $1', [req.params.id]);

  if (rows.length === 0) return res.status(404).json({ error: 'Cart not found' });

  const cart = rows[0]

  const { rows: items } = await pool.query(
    `SELECT ci.product_id, p.name, ci.quantity p.price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = $1
    ORDER BY ci.id`,
    [cart.id]
  )

  res.json({ ...cart, items });
});

router.post('/', async (req, res) => {
  const { user_id, items } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user id is required' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'no items in cart' });
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

const { rows: cartRows } = await pool.query(
  `INSERT INTO carts (user_id)
   VALUES ($1)
   RETURNING id, user_id, created_at`,
  [user_id]
);
const cart = cartRows[0];

for (const it of items) {
  const product = products.find(p => p.id === it.product_id);
  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)`,
    [cart.id, it.product_id, it.quantity]
  );
}

  res.status(201).json({ ...cart, items });
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM carts WHERE id = $1 RETURNING *', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Cart not found' });
  res.json(rows[0])
});

router.put('/:id/item', async (req, res) => {
    const cartId = req.params.id;
    const{ product_id, quantity } = req.body;

    if(!product_id || typeof quantity !== 'number') {
        return res.status(400).json({ error: 'product_id and numeric quantity required' })
    }

    if (quantity <= 0) {
        await pool.query(
            `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
            [cartId, product_id]
        );
    } else {
        await pool.query(
            `INSERT INTO cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, product_id)
            DO UPDATE SET quantity = EXCLUDED.quantity`,
            [cartId, product_id, quantity]
        );
    }

    const { rows: cartRows } = await pool.query(
    `SELECT * FROM carts WHERE id = $1`,
    [cartId]
    );
    if (!cartRows.length) return res.status(404).json({ error: 'Cart not found' });

    const cart = cartRows[0];
    const { rows: items } = await pool.query(
        `SELECT ci.product_id, p.name, ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.id`,
        [cart.id]
    );

    res.json({ ...cart, items });
})

module.exports = router;