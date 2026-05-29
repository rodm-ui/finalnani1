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

// --- MySQL (Aiven) connection ---
// Expected env:
//   DATABASE_URL = mysql://USER:PASSWORD@HOST:PORT/DBNAME?ssl-mode=REQUIRED
@@ -53,6 +62,9 @@ if (process.env.NODE_ENV !== "test") {
app.use(cors());
app.use(express.json());

// Serve the built React frontend from /dist
app.use(express.static(distPath));

// --- Helpers ---

async function select(sql, params = []) {
@@ -737,11 +749,9 @@ app.put("/api/contact", async (req, res) => {
  }
});

// Root route so hitting the server base URL returns something useful
// Root route serves the React app index.html so visiting the base URL shows the web UI
app.get("/", (_req, res) => {
  res.send(
    "BlooMery Flower Shop API is running. Use the React frontend build (dist/index.html) for the UI, and /api/* endpoints for data."
  );
  res.sendFile(path.join(distPath, "index.html"));
});

app.get("/api/health", async (_req, res) => {
