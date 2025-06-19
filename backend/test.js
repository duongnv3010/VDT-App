const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 30006,
});

// Middleware: authenticate JWT
async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload.username;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Failed to authenticate token" });
  }
}

// Sign up endpoint
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO user (username, password) VALUES (?, ?)", [
      username,
      hashed,
    ]);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  try {
    const [rows] = await pool.query("SELECT * FROM user WHERE username = ?", [
      username,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Student CRUD endpoints (protected)

// List all students
app.get("/students", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, dob, school FROM student"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new student
app.post("/students", authenticate, async (req, res) => {
  const { name, dob, school } = req.body;
  if (!name || !dob || !school) {
    return res
      .status(400)
      .json({ message: "Name, dob and school are required" });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO student (name, dob, school) VALUES (?, ?, ?)",
      [name, dob, school]
    );
    res.status(201).json({ id: result.insertId, name, dob, school });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an existing student
app.put("/students/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, dob, school } = req.body;
  if (!name && !dob && !school) {
    return res
      .status(400)
      .json({ message: "At least one field (name, dob, school) is required" });
  }
  const fields = [];
  const values = [];
  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (dob) {
    fields.push("dob = ?");
    values.push(dob);
  }
  if (school) {
    fields.push("school = ?");
    values.push(school);
  }
  values.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE student SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ id, name, dob, school });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a student
app.delete("/students/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM student WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
