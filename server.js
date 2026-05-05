const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔥 FORCE CLEAN TABLE (fix previous errors)
(async () => {
  try {
    await pool.query(`
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE,
        password TEXT,
        balance INTEGER
      );
    `);
    console.log("Fresh users table created");
  } catch (err) {
    console.error("Table error:", err);
  }
})();

// REGISTER
app.post("/register", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const check = await pool.query(
      "SELECT * FROM users WHERE phone=$1",
      [phone]
    );

    if (check.rows.length > 0) {
      return res.json({ success: false, message: "Account exists" });
    }

    await pool.query(
      "INSERT INTO users(phone,password,balance) VALUES($1,$2,$3)",
      [phone, password, 200]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.json({ success: false, message: "Server error during registration" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone=$1",
      [phone]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "No account" });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    res.json({ success: true, user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.json({ success: false, message: "Server error during login" });
  }
});

// VIEW USERS
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, phone, password, balance FROM users"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("USERS ERROR:", err);
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
