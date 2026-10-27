const jwt = require("jsonwebtoken");

const DEFAULT_SECRET = "change-this-secret-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

if (process.env.NODE_ENV === "production" && JWT_SECRET === DEFAULT_SECRET) {
  console.warn(
    "[SECURITY WARNING] Running with default JWT_SECRET in production. Set a strong JWT_SECRET in .env!"
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = payload; // { id, role, memberId? }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden — insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
