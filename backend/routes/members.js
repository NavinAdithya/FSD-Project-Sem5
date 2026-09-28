const express = require("express");
const bcrypt = require("bcryptjs");
const { load, save, uid } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function sanitize(m) {
  const { passwordHash, ...rest } = m;
  return rest;
}

router.get("/", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  res.json(db.members.map(sanitize));
});

// Librarian can register a member directly; default password = memberId (member should log in and note it)
router.post("/", requireAuth, requireRole("librarian"), (req, res) => {
  const { name, memberId, role, contact } = req.body || {};
  if (!name || !memberId) return res.status(400).json({ error: "Name and member ID are required" });
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
    passwordHash: bcrypt.hashSync(memberId, 10),
  };
  db.members.push(member);
  save(db);
  res.status(201).json(sanitize(member));
});

router.delete("/:id", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const hasActiveLoan = db.loans.some((l) => l.memberId === req.params.id && !l.returnDate);
  if (hasActiveLoan) return res.status(409).json({ error: "Can't remove a member with an active loan" });
  db.members = db.members.filter((m) => m.id !== req.params.id);
  db.reservations = db.reservations.filter((r) => r.memberId !== req.params.id);
  save(db);
  res.status(204).end();
});

module.exports = router;
