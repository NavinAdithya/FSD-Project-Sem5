const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { load, save, uid } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

router.post("/librarian-login", (req, res) => {
  const { username, password } = req.body || {};
  const db = load();
  const lib = db.librarians.find((l) => l.username === username);
  if (!lib || !bcrypt.compareSync(password || "", lib.passwordHash)) {
    return res.status(401).json({ error: "Invalid librarian credentials" });
  }
  const token = sign({ id: lib.id, role: "librarian" });
  res.json({ token, role: "librarian", name: lib.username });
});

router.post("/member-login", (req, res) => {
  const { memberId, password } = req.body || {};
  const db = load();
  const member = db.members.find((m) => m.memberId.toLowerCase() === String(memberId || "").toLowerCase());
  if (!member || !bcrypt.compareSync(password || "", member.passwordHash)) {
    return res.status(401).json({ error: "Invalid member ID or password" });
  }
  const token = sign({ id: member.id, role: "member", memberId: member.id });
  res.json({ token, role: "member", member: sanitizeMember(member) });
});

router.post("/member-register", (req, res) => {
  const { name, memberId, role, contact, password } = req.body || {};
  if (!name || !memberId || !password) {
    return res.status(400).json({ error: "Name, member ID and password are required" });
  }
  const db = load();
  if (db.members.some((m) => m.memberId.toLowerCase() === memberId.toLowerCase())) {
    return res.status(409).json({ error: "That member ID is already registered" });
  }
  const member = {
    id: uid("m"),
    memberId,
    name,
    role: role === "staff" ? "staff" : "student",
    contact: contact || "",
    passwordHash: bcrypt.hashSync(password, 10),
  };
  db.members.push(member);
  save(db);
  const token = sign({ id: member.id, role: "member", memberId: member.id });
  res.status(201).json({ token, role: "member", member: sanitizeMember(member) });
});

router.get("/me", require("../middleware/auth").requireAuth, (req, res) => {
  const db = load();
  if (req.user.role === "librarian") {
    const lib = db.librarians.find((l) => l.id === req.user.id);
    return res.json({ role: "librarian", name: lib ? lib.username : "librarian" });
  }
  const member = db.members.find((m) => m.id === req.user.memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json({ role: "member", member: sanitizeMember(member) });
});

function sanitizeMember(m) {
  const { passwordHash, ...rest } = m;
  return rest;
}

module.exports = router;
