import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the built React app
const distPath = path.resolve(__dirname, "dist");

app.use(cors());
app.use(express.json());

// Serve the built React frontend from /dist
app.use(express.static(distPath));

// --- Helpers ---
async function select(sql, params = []) {
  // example helper function
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// Root route serves the React app
app.get("/", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Health check failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
