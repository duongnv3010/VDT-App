const express = require("express");
const app = express();

const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

// --- PROMETHEUS METRICS ---
const client = require("prom-client");
const promBundle = require("express-prom-bundle");

// Giới hạn: tối đa 10 request / 1 phút, trả về 409 cho các request vượt ngưỡng
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  statusCode: 409, // HTTP 409 khi vượt quá
  message: {
    message: "Too many requests – please try again in a minute.",
  },
  standardHeaders: true, // gửi RateLimit-* headers
  legacyHeaders: false, // tắt X-RateLimit-* headers cũ
});

app.use(apiLimiter);

// 2.1. Default resource metrics (memory, cpu, eventloop...)
client.collectDefaultMetrics();

// 2.2. HTTP request metrics tự động cho Express
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  promClient: { collectDefaultMetrics: false },
});
app.use(metricsMiddleware);

// 2.3. Custom DB query metrics
const dbQueryCounter = new client.Counter({
  name: "db_query_total",
  help: "Số lần query tới database",
  labelNames: ["operation", "table"],
});

// 2.4. Custom business metric: đăng ký user
const userRegisterCounter = new client.Counter({
  name: "user_register_total",
  help: "Số user đã đăng ký thành công",
});

// 2.5. Custom business metric: student created
const studentCreatedCounter = new client.Counter({
  name: "student_created_total",
  help: "Số student đã tạo thành công",
});
// 2.6. Custom business metric: login failed
const loginFailCounter = new client.Counter({
  name: "login_failed_total",
  help: "Số lần đăng nhập thất bại",
});

dotenv.config();
app.use(cors());
app.use(bodyParser.json());

app.use(
  morgan(function (tokens, req, res) {
    return JSON.stringify({
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      time: Number(tokens["response-time"](req, res)),
    });
  })
);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));
// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

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
    req.user = {
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Failed to authenticate token" });
  }
}

/**
 * @param allowedRoles Array of roles permitted to access
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// Sign up endpoint
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO user (username, password, role) VALUES (?, ?, 'user')",
      [username, hashed]
    );
    dbQueryCounter.inc({ operation: "insert", table: "user" });
    userRegisterCounter.inc(); // đếm số user đăng ký thành công
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
      loginFailCounter.inc(); // đếm số lần đăng nhập thất bại
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { username: user.username, role: user.role },
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
app.get(
  "/students",
  authenticate,
  authorize(["user", "admin"]),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, dob, school FROM student"
      );
      dbQueryCounter.inc({ operation: "select", table: "student" });
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create a new student
app.post("/students", authenticate, authorize(["admin"]), async (req, res) => {
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
    dbQueryCounter.inc({ operation: "insert", table: "student" });
    studentCreatedCounter.inc();
    res.status(201).json({ id: result.insertId, name, dob, school });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an existing student
app.put(
  "/students/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    const { id } = req.params;
    const { name, dob, school } = req.body;
    if (!name && !dob && !school) {
      return res.status(400).json({
        message: "At least one field (name, dob, school) is required",
      });
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
      dbQueryCounter.inc({ operation: "update", table: "student" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json({ id, name, dob, school });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a student
app.delete(
  "/students/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await pool.query("DELETE FROM student WHERE id = ?", [
        id,
      ]);
      dbQueryCounter.inc({ operation: "delete", table: "student" });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json({ message: "Student deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
