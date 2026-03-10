const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./users.db");

// Create users table - Fixed with backticks
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    password TEXT,
    balance INTEGER
  )
`, (err) => {
    if (err) {
        console.error("Table creation error:", err.message);
    } else {
        console.log("Database table ready.");
    }
});

// REGISTER
app.post("/register", (req, res) => {
  const { phone, password } = req.body;

  db.get("SELECT * FROM users WHERE phone=?", [phone], (err, row) => {
    if (row) {
      return res.json({ success: false, message: "Account exists" });
    }

    db.run(
      "INSERT INTO users(phone,password,balance) VALUES(?,?,?)",
      [phone, password, 200],
      (err) => {
        if (err) {
          return res.json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { phone, password } = req.body;

  db.get("SELECT * FROM users WHERE phone=?", [phone], (err, user) => {
    if (!user) {
      return res.json({ success: false, message: "No account" });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    res.json({ success: true, user });
  });
});

// Use process.env.PORT for Render compatibility
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
