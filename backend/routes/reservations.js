const express = require("express");
const { load, save, uid } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  res.json(db.reservations);
});

router.get("/mine", requireAuth, requireRole("member"), (req, res) => {
  const db = load();
  res.json(db.reservations.filter((r) => r.memberId === req.user.memberId));
});

// Bulk queue info without exposing other members' identities to non-librarians
router.get("/queue-summary", requireAuth, (req, res) => {
  const db = load();
  const byBook = {};
  db.reservations.forEach((r) => {
    byBook[r.bookId] = byBook[r.bookId] || [];
    byBook[r.bookId].push(r);
  });
  const summary = {};
  Object.entries(byBook).forEach(([bookId, list]) => {
    const sorted = [...list].sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate));
    let myPosition = null;
    if (req.user.role === "member") {
      const idx = sorted.findIndex((r) => r.memberId === req.user.memberId);
      if (idx >= 0) myPosition = idx + 1;
    }
    summary[bookId] = { length: sorted.length, myPosition };
  });
  res.json(summary);
});

router.post("/", requireAuth, requireRole("member"), (req, res) => {
  const { bookId } = req.body || {};
  const db = load();
  const book = db.books.find((b) => b.id === bookId);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (db.reservations.some((r) => r.bookId === bookId && r.memberId === req.user.memberId)) {
    return res.status(409).json({ error: "You've already reserved this title" });
  }
  const reservation = { id: uid("r"), bookId, memberId: req.user.memberId, requestDate: new Date().toISOString() };
  db.reservations.push(reservation);
  save(db);
  res.status(201).json(reservation);
});

router.delete("/:id", requireAuth, (req, res) => {
  const db = load();
  const reservation = db.reservations.find((r) => r.id === req.params.id);
  if (!reservation) return res.status(404).json({ error: "Reservation not found" });
  if (req.user.role === "member" && reservation.memberId !== req.user.memberId) {
    return res.status(403).json({ error: "You can only cancel your own reservations" });
  }
  db.reservations = db.reservations.filter((r) => r.id !== req.params.id);
  save(db);
  res.status(204).end();
});

module.exports = router;
