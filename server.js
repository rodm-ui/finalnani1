import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// MySQL pool connection (Aiven MySQL requires SSL)
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
    // optional: use your Aiven CA certificate if required
    rejectUnauthorized: true,
  },
});

// Test DB connection
(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ Connected to MySQL database!");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection error:", err.message);
    process.exit(1);
  }
})();

// --- API Routes ---

// Products
app.get("/api/products", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY created_at DESC");
    res.json({ products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Categories
app.get("/api/categories", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM categories ORDER BY created_at DESC");
    res.json({ categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Orders
app.get("/api/orders", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json({ orders: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Post new order
app.post("/api/orders", async (req, res) => {
  const { items, paymentMethod, orderType, note, deliveryAddress } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "No order items provided" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const total = items.reduce((sum, i) => sum + i.unitPricePhp * i.quantity, 0);

    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_id, customer_name, total_amount_php, payment_method, order_type, note, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, "BlooMery Customer", total, paymentMethod, orderType, note || null, deliveryAddress || null]
    );
    const orderId = (orderResult as any).insertId;

    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price_php) VALUES (?, ?, ?, ?)",
        [orderId, item.productId, item.quantity, item.unitPricePhp]
      );
    }

    await conn.commit();
    res.json({ order: { id: orderId, total_amount_php: total, items } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  } finally {
    conn.release();
  }
});

// Serve React frontend in production
const distPath = path.resolve(__dirname, "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Root route
app.get("/", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
