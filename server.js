const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ENHANCED PostgreSQL Connection
// Added keepalives to prevent Render from dropping "idle" connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true, // Prevents the database from closing the connection for being quiet
});

// ✅ CRITICAL: Catch errors on idle clients to prevent the "Unexpectedly terminated" crash
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client:", err.message);
});

pool.on("connect", () => {
  console.log("✅ Database Pool Connected");
});

// ✅ Initialize DB with better error handling
async function initDB() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE,
        password TEXT,
        balance INTEGER DEFAULT 200
      );
    `);
    console.log("🚀 Database Table Ready");
  } catch (err) {
    console.error("❌ DB INIT ERROR:", err.message);
  } finally {
    if (client) client.release();
  }
}

initDB();

// REGISTER
app.post("/register", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const check = await pool.query("SELECT phone FROM users WHERE phone=$1", [phone]);
    
    if (check.rows.length > 0) {
      return res.json({ success: false, message: "Account exists" });
    }

    await pool.query(
      "INSERT INTO users(phone, password, balance) VALUES($1, $2, $3)",
      [phone, password, 200]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    res.status(500).json({ success: false, message: "Database error during registration" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "No account" });
    }

    const user = result.rows[0];
    if (user.password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    res.status(500).json({ success: false, message: "Database error during login" });
  }
});

// VIEW USERS
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, phone, password, balance FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error("USERS ERROR:", err.message);
    res.status(500).json([]);
  }
});

// HEALTH CHECK (To see if service is alive)
app.get("/health", (req, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
