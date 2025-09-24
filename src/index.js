require('dotenv').config();
const express = require('express');
const cors = require('cors');
const products = require('./routes/products');
const users = require('./routes/users');
const orders = require('./routes/orders')
const { notFound, errorHandler } = require('./middleware/error.js');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/products', products);
app.use('/users', users);
app.use('/orders', orders)

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
