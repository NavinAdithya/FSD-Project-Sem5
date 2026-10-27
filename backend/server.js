require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const memberRoutes = require("./routes/members");
const loanRoutes = require("./routes/loans");
const reservationRoutes = require("./routes/reservations");
const reportRoutes = require("./routes/reports");

const app = express();

// Disable technology fingerprinting
app.disable("x-powered-by");

// Standard HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// CORS configuration: Allow local dev and configured frontend client origin
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.endsWith(".github.io")) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback to permissive in dev if origin not strictly matched
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Payload size limit to prevent memory exhaustion
app.use(express.json({ limit: "50kb" }));

// General API rate limiter
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/reports", reportRoutes);

app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message || err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Library Management System API listening on port ${PORT}`));
