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
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanId = typeof memberId === "string" ? memberId.trim() : "";
  const cleanContact = typeof contact === "string" ? contact.trim() : "";
  const cleanRole = role === "staff" ? "staff" : "student";

  if (!cleanName || cleanName.length > 100) return res.status(400).json({ error: "Name is required (max 100 characters)" });
  if (!cleanId || cleanId.length > 50) return res.status(400).json({ error: "Member ID is required (max 50 characters)" });

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
    passwordHash: bcrypt.hashSync(cleanId.toLowerCase(), 10),
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
