require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
})

app.get('/db-ping', async(req, res) => {
    try {
        const { rows } = await pool.query('SELECT NOW() AS now');
        res.json({ ok:true, now: rows[0].now })
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message })
    }
})

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});