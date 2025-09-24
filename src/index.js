require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
});

app.get('/db-ping', async(req, res) => {
    try {
        const { rows } = await pool.query('SELECT NOW() AS now');
        res.json({ ok:true, now: rows[0].now })
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message })
    }
});

app.get('/products', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' })
    }
});

app.get('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    const { rows } = await pool.query(
      'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/products/:id', async(req, res) => {
    try {
        const id = req.params.id;
        const { name, description, price, stock } = req.body;

        if (!name || !price < 0 || !stock < 0) {
            return res.status(400).json({ error: 'Invalid input: name, price and stock required, price/stock must be >= 0' })
        };

        const { rows } = await pool.query(
        'UPDATE products SET name = $1, description = $2, price = $3, stock = $4 WHERE id = $5 RETURNING *',
        [name, description, price, stock, id]
        );

        if (rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
        };

        res.status(200).json(rows[0]);
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])

        if (rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
        };

        res.status(200).json(rows[0]);
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
    }
});

app.get('/users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' })
    }
});

app.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { email, phone, address_line1, address_line2, city, postcode, password_hash } = req.body;

    if (!email || !password_hash) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (email, phone, address_line1, address_line2, city, postcode, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, phone, address_line1, address_line2, city, postcode, created_at`,
      [email, phone, address_line1, address_line2, city, postcode, password_hash]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') { 
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.put('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { email, phone, address_line1, address_line2, city, postcode, password_hash } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET email = $1,
           phone = $2,
           address_line1 = $3,
           address_line2 = $4,
           city = $5,
           postcode = $6,
           password_hash = COALESCE($7, password_hash)
       WHERE id = $8
       RETURNING id, email, phone, address_line1, address_line2, city, postcode, created_at`,
      [email, phone, address_line1, address_line2, city, postcode, password_hash ?? null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.delete('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id])

        if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
        };

        res.status(200).json(rows[0]);
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
    }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});