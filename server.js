import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- MySQL (Aiven) connection ---
// Expected env:
//   DATABASE_URL = mysql://USER:PASSWORD@HOST:PORT/DBNAME?ssl-mode=REQUIRED
// Optionally, you can also use DB_HOST / DB_USER / DB_PASSWORD / DB_NAME instead.

let pool;

function createPool() {
  if (process.env.DATABASE_URL) {
    // Use MySQL connection URI (recommended for Aiven)
    pool = mysql.createPool(process.env.DATABASE_URL);
  } else {
    // Fallback to discrete env vars (local dev)
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "bloomery",
    });
  }
}

createPool();

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    if (rows && rows[0] && rows[0].ok === 1) {
      console.log("✅ Connected to MySQL");
    } else {
      console.log("✅ MySQL connection test query ran");
    }
  } catch (err) {
    console.error("❌ Error connecting to MySQL", err.message);
  }
}

if (process.env.NODE_ENV !== "test") {
  testConnection();
}

app.use(cors());
app.use(express.json());

// --- Helpers ---

async function select(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function mapOrderRow(row) {
  const createdAtValue = row.created_at;
  const createdAt =
    createdAtValue instanceof Date
      ? createdAtValue.toISOString()
      : new Date(createdAtValue).toISOString();

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    totalAmountPhp: Number(row.total_amount_php),
    paymentMethod: row.payment_method,
    orderType: row.order_type,
    status: row.status,
    note: row.note ?? undefined,
    deliveryAddress: row.delivery_address ?? undefined,
    createdAt,
  };
}

// --- Auth ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    const emailLower = String(email).toLowerCase();

    const existing = await select("SELECT id FROM users WHERE email = ?", [
      emailLower,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const [insertResult] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [name, emailLower, password]
    );

    const userId = insertResult.insertId;
    const users = await select(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );
    const user = users[0];

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("/api/auth/register error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const emailLower = String(email).toLowerCase();

    const users = await select(
      "SELECT id, name, email, role, password FROM users WHERE email = ?",
      [emailLower]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("/api/auth/login error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Users (admin view only on frontend) ---

app.get("/api/users", async (_req, res) => {
  try {
    const rows = await select(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(
      rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
      }))
    );
  } catch (err) {
    console.error("/api/users error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Categories ---

app.get("/api/categories", async (_req, res) => {
  try {
    const rows = await select(
      "SELECT id, name, description, created_at FROM categories ORDER BY name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/categories error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    const [result] = await pool.query(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      [name, description || null]
    );
    const id = result.insertId;
    const rows = await select(
      "SELECT id, name, description, created_at FROM categories WHERE id = ?",
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/categories error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    const [result] = await pool.query(
      "UPDATE categories SET name = ?, description = ? WHERE id = ?",
      [name, description || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    const rows = await select(
      "SELECT id, name, description, created_at FROM categories WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/categories/:id error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/categories/:id error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Products ---

app.get("/api/products", async (_req, res) => {
  try {
    const rows = await select(
      "SELECT id, category_id, name, description, price_php, image_url, is_featured, created_at FROM products ORDER BY created_at DESC"
    );
    res.json(
      rows.map((p) => ({
        id: p.id,
        categoryId: p.category_id,
        name: p.name,
        description: p.description,
        pricePhp: Number(p.price_php),
        imageUrl: p.image_url,
        isFeatured: !!p.is_featured,
        createdAt: p.created_at,
      }))
    );
  } catch (err) {
    console.error("GET /api/products error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { categoryId, name, description, pricePhp, imageUrl, isFeatured } =
      req.body;
    if (!categoryId || !name || !pricePhp) {
      return res
        .status(400)
        .json({ message: "categoryId, name and pricePhp are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO products (category_id, name, description, price_php, image_url, is_featured) VALUES (?, ?, ?, ?, ?, ?)",
      [
        categoryId,
        name,
        description || "",
        pricePhp,
        imageUrl || null,
        !!isFeatured,
      ]
    );
    const id = result.insertId;
    const rows = await select(
      "SELECT id, category_id, name, description, price_php, image_url, is_featured, created_at FROM products WHERE id = ?",
      [id]
    );
    const p = rows[0];
    res.status(201).json({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      pricePhp: Number(p.price_php),
      imageUrl: p.image_url,
      isFeatured: !!p.is_featured,
      createdAt: p.created_at,
    });
  } catch (err) {
    console.error("POST /api/products error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, pricePhp, imageUrl, isFeatured } =
      req.body;
    if (!categoryId || !name || !pricePhp) {
      return res
        .status(400)
        .json({ message: "categoryId, name and pricePhp are required" });
    }
    const [result] = await pool.query(
      "UPDATE products SET category_id = ?, name = ?, description = ?, price_php = ?, image_url = ?, is_featured = ? WHERE id = ?",
      [
        categoryId,
        name,
        description || "",
        pricePhp,
        imageUrl || null,
        !!isFeatured,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    const rows = await select(
      "SELECT id, category_id, name, description, price_php, image_url, is_featured, created_at FROM products WHERE id = ?",
      [id]
    );
    const p = rows[0];
    res.json({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      pricePhp: Number(p.price_php),
      imageUrl: p.image_url,
      isFeatured: !!p.is_featured,
      createdAt: p.created_at,
    });
  } catch (err) {
    console.error("PUT /api/products/:id error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/products/:id error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Orders ---

app.get("/api/orders", async (req, res) => {
  try {
    const { customerId } = req.query;

    let orderRows;
    if (customerId) {
      orderRows = await select(
        "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
        [customerId]
      );
    } else {
      orderRows = await select(
        "SELECT * FROM orders ORDER BY created_at DESC"
      );
    }

    const orders = orderRows.map(mapOrderRow);
    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o.id);
    const [itemRows] = await pool.query(
      "SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id ASC",
      [orderIds]
    );

    const itemsByOrder = new Map();
    for (const row of itemRows) {
      const item = {
        productId: row.product_id,
        quantity: row.quantity,
        unitPricePhp: Number(row.unit_price_php),
      };
      const existing = itemsByOrder.get(row.order_id) || [];
      existing.push(item);
      itemsByOrder.set(row.order_id, existing);
    }

    const ordersWithItems = orders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));

    res.json(ordersWithItems);
  } catch (err) {
    console.error("GET /api/orders error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/orders", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      customerId,
      paymentMethod,
      orderType,
      note,
      deliveryAddress,
      items,
    } = req.body;

    if (!customerId || !paymentMethod || !orderType || !Array.isArray(items)) {
      conn.release();
      return res.status(400).json({
        message: "customerId, paymentMethod, orderType and items are required",
      });
    }

    if (items.length === 0) {
      conn.release();
      return res.status(400).json({ message: "At least one item is required" });
    }

    await conn.beginTransaction();

    const [userRows] = await conn.query(
      "SELECT id, name FROM users WHERE id = ?",
      [customerId]
    );
    if (userRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Customer not found" });
    }

    const customerName = userRows[0].name;

    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.unitPricePhp) * Number(item.quantity),
      0
    );

    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_id, customer_name, total_amount_php, payment_method, order_type, status, note, delivery_address) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)",
      [
        customerId,
        customerName,
        totalAmount,
        paymentMethod,
        orderType,
        note || null,
        deliveryAddress || null,
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price_php) VALUES (?, ?, ?, ?)",
        [orderId, item.productId, item.quantity, item.unitPricePhp]
      );
    }

    await conn.commit();

    const orders = await select("SELECT * FROM orders WHERE id = ?", [
      orderId,
    ]);
    const orderRow = orders[0];

    const orderItemRows = await select(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
      [orderId]
    );

    const order = mapOrderRow(orderRow);
    order.items = orderItemRows.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      unitPricePhp: Number(row.unit_price_php),
    }));

    res.status(201).json(order);
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    console.error("POST /api/orders error", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    conn.release();
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const [result] = await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    const orders = await select("SELECT * FROM orders WHERE id = ?", [
      id,
    ]);
    const orderRow = orders[0];
    const itemsRows = await select(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
      [orderRow.id]
    );
    const order = mapOrderRow(orderRow);
    order.items = itemsRows.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      unitPricePhp: Number(row.unit_price_php),
    }));
    res.json(order);
  } catch (err) {
    console.error("PATCH /api/orders/:id/status error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Settings & contact (single-row tables) ---

const defaultSettings = {
  primaryColor: "rose-600",
  accentColor: "pink-500",
  backgroundStyle: "gradient",
  heroTagline: "Fresh, hand-tied bouquets for every story you want to tell.",
};

const defaultContact = {
  phone: "+63 917 123 4567",
  email: "hello@bloomery.ph",
  address: "123 Bloom Lane, Quezon City, Metro Manila",
  facebook: "facebook.com/BlooMeryPH",
  instagram: "@bloomery.ph",
};

app.get("/api/settings", async (_req, res) => {
  try {
    const rows = await select("SELECT * FROM settings LIMIT 1");
    if (rows.length === 0) {
      return res.json(defaultSettings);
    }
    const s = rows[0];
    res.json({
      primaryColor: s.primary_color,
      accentColor: s.accent_color,
      backgroundStyle: s.background_style,
      heroTagline: s.hero_tagline,
    });
  } catch (err) {
    console.error("GET /api/settings error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { primaryColor, accentColor, backgroundStyle, heroTagline } = req.body;
    const rows = await select("SELECT id FROM settings LIMIT 1");
    if (rows.length === 0) {
      const [result] = await pool.query(
        "INSERT INTO settings (primary_color, accent_color, background_style, hero_tagline) VALUES (?, ?, ?, ?)",
        [
          primaryColor || defaultSettings.primaryColor,
          accentColor || defaultSettings.accentColor,
          backgroundStyle || defaultSettings.backgroundStyle,
          heroTagline || defaultSettings.heroTagline,
        ]
      );
      const id = result.insertId;
      const newRows = await select("SELECT * FROM settings WHERE id = ?", [
        id,
      ]);
      const s = newRows[0];
      return res.json({
        primaryColor: s.primary_color,
        accentColor: s.accent_color,
        backgroundStyle: s.background_style,
        heroTagline: s.hero_tagline,
      });
    }
    const id = rows[0].id;
    await pool.query(
      "UPDATE settings SET primary_color = ?, accent_color = ?, background_style = ?, hero_tagline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        primaryColor || defaultSettings.primaryColor,
        accentColor || defaultSettings.accentColor,
        backgroundStyle || defaultSettings.backgroundStyle,
        heroTagline || defaultSettings.heroTagline,
        id,
      ]
    );
    const updatedRows = await select("SELECT * FROM settings WHERE id = ?", [
      id,
    ]);
    const s = updatedRows[0];
    res.json({
      primaryColor: s.primary_color,
      accentColor: s.accent_color,
      backgroundStyle: s.background_style,
      heroTagline: s.hero_tagline,
    });
  } catch (err) {
    console.error("PUT /api/settings error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/contact", async (_req, res) => {
  try {
    const rows = await select("SELECT * FROM contact_info LIMIT 1");
    if (rows.length === 0) {
      return res.json(defaultContact);
    }
    const c = rows[0];
    res.json({
      phone: c.phone,
      email: c.email,
      address: c.address,
      facebook: c.facebook || undefined,
      instagram: c.instagram || undefined,
    });
  } catch (err) {
    console.error("GET /api/contact error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/contact", async (req, res) => {
  try {
    const { phone, email, address, facebook, instagram } = req.body;
    const rows = await select("SELECT id FROM contact_info LIMIT 1");
    if (rows.length === 0) {
      const [result] = await pool.query(
        "INSERT INTO contact_info (phone, email, address, facebook, instagram) VALUES (?, ?, ?, ?, ?)",
        [
          phone || defaultContact.phone,
          email || defaultContact.email,
          address || defaultContact.address,
          facebook || null,
          instagram || null,
        ]
      );
      const id = result.insertId;
      const newRows = await select("SELECT * FROM contact_info WHERE id = ?", [
        id,
      ]);
      const c = newRows[0];
      return res.json({
        phone: c.phone,
        email: c.email,
        address: c.address,
        facebook: c.facebook || undefined,
        instagram: c.instagram || undefined,
      });
    }
    const id = rows[0].id;
    await pool.query(
      "UPDATE contact_info SET phone = ?, email = ?, address = ?, facebook = ?, instagram = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        phone || defaultContact.phone,
        email || defaultContact.email,
        address || defaultContact.address,
        facebook || null,
        instagram || null,
        id,
      ]
    );
    const updatedRows = await select("SELECT * FROM contact_info WHERE id = ?", [
      id,
    ]);
    const c = updatedRows[0];
    res.json({
      phone: c.phone,
      email: c.email,
      address: c.address,
      facebook: c.facebook || undefined,
      instagram: c.instagram || undefined,
    });
  } catch (err) {
    console.error("PUT /api/contact error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await select("SELECT 1 AS ok");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("/api/health error", err);
    res.status(500).json({ status: "error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BlooMery API server listening on port ${PORT}`);
});
