import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// MySQL Connection Pool
const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: true, // required for Aiven
  },
});

// Test DB connection on startup
(async () => {
  try {
    const conn = await db.getConnection();
    console.log('✅ Connected to MySQL database!');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(1); // stop server if db cannot connect
  }
})();

// API Routes

// Products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: rows });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY created_at DESC');
    res.json({ categories: rows });
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ orders: rows });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Post new order
app.post('/api/orders', async (req, res) => {
  const { items, paymentMethod, orderType, note, deliveryAddress } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No order items provided' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // calculate total
    const total = items.reduce((sum, i) => sum + i.unitPricePhp * i.quantity, 0);

    // insert order
    const [orderResult] = await conn.query(
      'INSERT INTO orders (customer_id, customer_name, total_amount_php, payment_method, order_type, note, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 'BlooMery Customer', total, paymentMethod, orderType, note || null, deliveryAddress || null]
    );
    const orderId = (orderResult as any).insertId;

    // insert items
    for (const item of items) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price_php) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, item.unitPricePhp]
      );
    }

    await conn.commit();
    res.json({ order: { id: orderId, total_amount_php: total, items } });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Serve Vite frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
