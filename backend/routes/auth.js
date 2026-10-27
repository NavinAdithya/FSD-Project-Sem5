const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { load, save, uid } = require("../db");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "12h" });
}

function sanitizeMember(m) {
  const { passwordHash, ...rest } = m;
  return rest;
}

// LIBRARIAN LOGIN — Protected by auth rate limiter
router.post("/librarian-login", authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password must be provided as text" });
  }

  const cleanUser = username.trim();
  if (!cleanUser || !password || password.length > 128) {
    return res.status(401).json({ error: "Invalid librarian credentials" });
  }

  const db = load();
  const lib = db.librarians.find((l) => l.username.toLowerCase() === cleanUser.toLowerCase());
  if (!lib || !bcrypt.compareSync(password, lib.passwordHash)) {
    return res.status(401).json({ error: "Invalid librarian credentials" });
  }

  const token = sign({ id: lib.id, role: "librarian" });
  res.json({ token, role: "librarian", name: lib.username });
});

// MEMBER LOGIN — Protected by auth rate limiter
router.post("/member-login", authLimiter, (req, res) => {
  const { memberId, password } = req.body || {};
  if (typeof memberId !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Member ID and password must be provided as text" });
  }

  const cleanId = memberId.trim();
  if (!cleanId || !password || password.length > 128) {
    return res.status(401).json({ error: "Invalid member ID or password" });
  }

  const db = load();
  const member = db.members.find(
    (m) => m.memberId.toLowerCase() === cleanId.toLowerCase()
  );
  if (!member || !bcrypt.compareSync(password, member.passwordHash)) {
    return res.status(401).json({ error: "Invalid member ID or password" });
  }

  const token = sign({ id: member.id, role: "member", memberId: member.id });
  res.json({ token, role: "member", member: sanitizeMember(member) });
});

// MEMBER REGISTER — Protected by auth rate limiter and strict validation
router.post("/member-register", authLimiter, (req, res) => {
  const { name, memberId, role, contact, password } = req.body || {};

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanId = typeof memberId === "string" ? memberId.trim() : "";
  const cleanPass = typeof password === "string" ? password : "";
  const cleanContact = typeof contact === "string" ? contact.trim() : "";
  const cleanRole = role === "staff" ? "staff" : "student";

  if (!cleanName || cleanName.length > 100) {
    return res.status(400).json({ error: "Full name is required (max 100 characters)" });
  }
  if (!cleanId || cleanId.length > 50) {
    return res.status(400).json({ error: "Member ID is required (max 50 characters)" });
  }
  if (!cleanPass || cleanPass.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }
  if (cleanPass.length > 128) {
    return res.status(400).json({ error: "Password cannot exceed 128 characters" });
  }

  const db = load();
  if (db.members.some((m) => m.memberId.toLowerCase() === cleanId.toLowerCase())) {
    return res.status(409).json({ error: "That member ID is already registered" });
  }

  const member = {
    id: uid("m"),
    memberId: cleanId,
    name: cleanName,
    role: cleanRole,
    contact: cleanContact,
    passwordHash: bcrypt.hashSync(cleanPass, 10),
  };

  db.members.push(member);
  save(db);

  const token = sign({ id: member.id, role: "member", memberId: member.id });
  res.status(201).json({ token, role: "member", member: sanitizeMember(member) });
});

// GET CURRENT SESSION
router.get("/me", requireAuth, (req, res) => {
  const db = load();
  if (req.user.role === "librarian") {
    const lib = db.librarians.find((l) => l.id === req.user.id);
    return res.json({ role: "librarian", name: lib ? lib.username : "librarian" });
  }
  const member = db.members.find((m) => m.id === req.user.memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json({ role: "member", member: sanitizeMember(member) });
});

module.exports = router;
