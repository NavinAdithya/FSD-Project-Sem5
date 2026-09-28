const express = require("express");
const { load, save, uid } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const CATEGORY_PREFIX = {
  "Computer Science": "COM",
  Science: "SCI",
  Politics: "POL",
  History: "HIS",
  Literature: "LIT",
  Mathematics: "MAT",
  Other: "GEN",
};

function nextCallNumber(books, category) {
  const prefix = CATEGORY_PREFIX[category] || "GEN";
  const count = books.filter((b) => b.callNumber.startsWith(prefix)).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

router.get("/", requireAuth, (req, res) => {
  const db = load();
  res.json(db.books);
});

router.post("/", requireAuth, requireRole("librarian"), (req, res) => {
  const { title, author, isbn, category, totalCopies } = req.body || {};
  if (!title || !author) return res.status(400).json({ error: "Title and author are required" });
  const db = load();
  const copies = Math.max(1, Number(totalCopies) || 1);
  const book = {
    id: uid("b"),
    title,
    author,
    isbn: isbn || "",
    category: category || "Other",
    callNumber: nextCallNumber(db.books, category || "Other"),
    totalCopies: copies,
    availableCopies: copies,
  };
  db.books.push(book);
  save(db);
  res.status(201).json(book);
});

router.delete("/:id", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const hasActiveLoan = db.loans.some((l) => l.bookId === req.params.id && !l.returnDate);
  if (hasActiveLoan) return res.status(409).json({ error: "Can't remove a title with an active loan" });
  db.books = db.books.filter((b) => b.id !== req.params.id);
  db.reservations = db.reservations.filter((r) => r.bookId !== req.params.id);
  save(db);
  res.status(204).end();
});

module.exports = router;
