# BlooMery Flower Shop – Full Stack (React + Node + **MySQL on Aiven**)

This project is a full-stack implementation of **BlooMery Flower Shop**, with:

- **Frontend**: React + Vite + Tailwind CSS (in `src/`)
- **Backend**: Node.js + Express (in `server.js`)
- **Database**: **MySQL** (e.g., on **Aiven for MySQL**) used for users, products, categories, orders, appearance settings, and contact info.

The app supports **Admin** and **Customer** roles, login/registration, managing flower bouquet products, and placing orders in **Philippine Peso (PHP)** with options for **Delivery** (with delivery address) or **Pickup**.

> All data is designed to be stored in MySQL. The schema below creates all tables with **no initial data (empty records)** so the system is truly database-based and can be kept in sync in real time via the API.

---

## 1. Database Setup (Aiven MySQL)

You can use any MySQL instance, but these instructions assume **Aiven for MySQL**.

1. Create a **MySQL** service on Aiven.
2. Get the **Service URI** (connection string) from Aiven, which looks like:
   ```
   mysql://USER:PASSWORD@HOST:PORT/DBNAME?ssl-mode=REQUIRED
   ```
3. Set this URI as `DATABASE_URL` in a `.env` file at the project root (see [Backend Configuration](#2-backend-configuration-nodejs--express)).
4. Run the SQL below against your Aiven MySQL database to create the schema. **This script creates all tables with NO initial rows (empty)**.

> You can run the script using any MySQL client – e.g., MySQL CLI (`mysql`), DBeaver, TablePlus, Aiven console query tool, etc.

### 1.1. MySQL Schema (Empty Data)

```sql
-- BlooMery Flower Shop database schema (MySQL)
-- This script creates all tables with NO initial rows.

-- Drop tables if they already exist (optional, only for resetting a dev DB)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS contact_info;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users: admins and customers
CREATE TABLE users (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL, -- For demo purposes only; hash in production
  role       VARCHAR(50)  NOT NULL DEFAULT 'customer', -- 'admin' or 'customer'
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Categories: e.g., Romantic, Birthday, Sympathy
CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products (bouquets)
CREATE TABLE products (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT         NOT NULL,
  price_php   DECIMAL(10,2) NOT NULL,
  image_url   TEXT,
  is_featured TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_products_category_id (category_id),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders
CREATE TABLE orders (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id      INT UNSIGNED NOT NULL,
  customer_name    VARCHAR(255) NOT NULL,
  total_amount_php DECIMAL(10,2) NOT NULL,
  payment_method   VARCHAR(50)   NOT NULL,  -- e.g. 'Cash', 'E-Wallet'
  order_type       VARCHAR(50)   NOT NULL,  -- 'Pickup' or 'Delivery'
  status           VARCHAR(50)   NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed', 'Cancelled'
  note             TEXT,
  delivery_address TEXT,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_orders_customer_id (customer_id),
  INDEX idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items (bouquets inside an order)
CREATE TABLE order_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       INT UNSIGNED NOT NULL,
  product_id     INT UNSIGNED NOT NULL,
  quantity       INT          NOT NULL,
  unit_price_php DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_order_items_order_id (order_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Appearance settings (single-row table)
CREATE TABLE settings (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  primary_color    VARCHAR(100) NOT NULL DEFAULT 'rose-600',
  accent_color     VARCHAR(100) NOT NULL DEFAULT 'pink-500',
  background_style VARCHAR(50)  NOT NULL DEFAULT 'gradient', -- 'gradient' or 'solid'
  hero_tagline     TEXT         NOT NULL DEFAULT 'Fresh, hand-tied bouquets for every story you want to tell.',
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact information (single-row table)
CREATE TABLE contact_info (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone      VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  address    TEXT         NOT NULL,
  facebook   VARCHAR(255),
  instagram  VARCHAR(255),
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: No data is inserted here. All tables start EMPTY.
-- To create the first admin user, you can manually insert one, for example:
-- INSERT INTO users (name, email, password, role)
-- VALUES ('BlooMery Admin', 'admin@bloomery.ph', 'admin123', 'admin');
```

> The admin insert above is **optional**; if you run it, you can log in as that admin. If you want an entirely empty database, do **not** run the INSERT and instead create users via the API.

---

## 2. Backend Configuration (Node.js + Express + MySQL)

The backend server is in **`server.js`** and uses:

- `express` for HTTP routing
- `cors` to allow the React app to call the API
- `mysql2/promise` to talk to MySQL
- `dotenv` to load environment variables from `.env`

### 2.1. Environment variables

Create a `.env` file in the project root with at least:

```env
# Aiven MySQL connection string (Service URI)
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DBNAME?ssl-mode=REQUIRED

# Port for the API server
PORT=4000
```

Alternatively, you can use discrete variables if you don’t want to use a URI:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=bloomery
```

In that case, leave `DATABASE_URL` unset and the server will fall back to these.

### 2.2. Running the backend server

```bash
npm install  # if you haven\'t already
node server.js
```

The server exposes REST endpoints under `/api/*`, for example:

- `POST /api/auth/register` – register a customer
- `POST /api/auth/login` – login (Admin or Customer)
- `GET /api/users` – list users (used by Admin dashboard)
- `GET /api/categories` / `POST /api/categories` / `PUT /api/categories/:id` / `DELETE /api/categories/:id`
- `GET /api/products` / `POST /api/products` / `PUT /api/products/:id` / `DELETE /api/products/:id`
- `GET /api/orders?customerId=...` – list orders (filtered by customer for customers, all for admins)
- `POST /api/orders` – create order with items, notes, payment method, order type, **delivery address** (for deliveries)
- `PATCH /api/orders/:id/status` – update order status
- `GET /api/settings` / `PUT /api/settings` – storefront appearance
- `GET /api/contact` / `PUT /api/contact` – contact details
- `GET /api/health` – simple health check

All bouquet data, categories, orders, settings, and contact info are now **stored in MySQL**, making the system database-based and ready for real-time usage via these APIs.

---

## 3. Frontend (React + Vite + Tailwind)

The frontend lives in `src/` and is built with React, Vite, and Tailwind CSS. The main entry point is `src/App.tsx`.

Key features already implemented in the UI:

- **Login/Registration UI** (Admin vs Customer)
- **Customer role**
  - Browse bouquets (products)
  - Add to cart and checkout
  - Choose **Cash** or **E-Wallet** payment
  - Choose **Delivery** or **Pickup** order type
  - Enter **Delivery address** when using Delivery
  - See their own orders (with delivery address) in the "My orders" page
- **Admin role** (once you have an admin user in the DB)
  - Manage products and categories (CRUD)
  - View and update all orders and statuses
  - Customize appearance (hero tagline, background style, colors)
  - Edit contact info (phone, email, address, social links)
  - View all registered users (admins and customers)

> The current frontend logic uses local state; the API server in `server.js` is ready to be wired up so all of these operations can persist to and read from the Aiven MySQL database in real time.

### 3.1. Frontend dev server

```bash
npm run dev
```

This starts Vite (default: http://localhost:5173).

If you expose the API on `http://localhost:4000`, you can connect the frontend to it (e.g., via `fetch`/`axios` using that base URL) when you are ready to move from local-only state to full database-backed state.

---

## 4. Production build

To build the frontend for production:

```bash
npm run build
```

This produces a static bundle in `dist/`. You can deploy the static frontend and the Node.js API server separately, both pointing to the same Aiven MySQL database.

---

## 5. Notes

- **Security**: Passwords are stored as plain text for demo purposes in this implementation. For a real system, you must:
  - Use password hashing (e.g., bcrypt) and never store plain text passwords.
  - Add proper authentication (JWT or server sessions) and authorization checks on admin-only endpoints.
- **Seed data**: The schema is created **empty**. You can either:
  - Manually insert an admin user with the commented `INSERT INTO users ...` in the SQL above, and then log in as that admin; or
  - Extend the backend with an admin creation route (not included by default for security reasons).

This setup makes BlooMery Flower Shop fully **MySQL-backed** and ready to run against an Aiven MySQL instance, with all flowers, orders, and configuration stored in the database rather than only in frontend memory.