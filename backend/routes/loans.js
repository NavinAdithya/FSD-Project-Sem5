const express = require("express");
const { load, save, uid } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const FINE_PER_DAY = 5;
const RENEW_DAYS = 14;

const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
};
const daysBetween = (a, b) => Math.floor((new Date(a) - new Date(b)) / 86400000);
const isOverdue = (loan) => !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());

router.get("/", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  res.json(db.loans);
});

router.get("/mine", requireAuth, requireRole("member"), (req, res) => {
  const db = load();
  res.json(db.loans.filter((l) => l.memberId === req.user.memberId));
});

router.post("/issue", requireAuth, requireRole("librarian"), (req, res) => {
  const { bookId, memberId, days } = req.body || {};
  const db = load();
  const book = db.books.find((b) => b.id === bookId);
  const member = db.members.find((m) => m.id === memberId);
  if (!book || !member) return res.status(404).json({ error: "Book or member not found" });
  if (book.availableCopies < 1) return res.status(409).json({ error: "No copies available" });

  const issueDate = new Date();
  const loanDays = Math.min(60, Math.max(1, parseInt(days, 10) || 14));
  const dueDate = addDays(issueDate, loanDays);
  const loan = {
    id: uid("l"),
    bookId,
    memberId,
    issueDate: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    returnDate: null,
    fineAmount: 0,
    finePaid: true,
    renewed: false,
  };
  db.loans.unshift(loan);
  book.availableCopies -= 1;
  db.reservations = db.reservations.filter((r) => !(r.bookId === bookId && r.memberId === memberId));
  save(db);
  res.status(201).json(loan);
});

router.post("/:id/return", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const loan = db.loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.returnDate) return res.status(409).json({ error: "Loan already returned" });
  const book = db.books.find((b) => b.id === loan.bookId);

  const returnDate = new Date();
  const lateDays = Math.max(0, daysBetween(new Date(returnDate.toDateString()), new Date(new Date(loan.dueDate).toDateString())));
  const fineAmount = lateDays * FINE_PER_DAY;

  loan.returnDate = returnDate.toISOString();
  loan.fineAmount = fineAmount;
  loan.finePaid = fineAmount === 0;
  if (book) book.availableCopies += 1;
  save(db);
  res.json(loan);
});

router.post("/:id/renew", requireAuth, (req, res) => {
  const db = load();
  const loan = db.loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (req.user.role === "member" && loan.memberId !== req.user.memberId) {
    return res.status(403).json({ error: "You can only renew your own loans" });
  }
  if (loan.returnDate) return res.status(409).json({ error: "Loan already returned" });
  if (loan.renewed) return res.status(409).json({ error: "This loan has already been renewed once" });
  if (db.reservations.some((r) => r.bookId === loan.bookId)) {
    return res.status(409).json({ error: "Can't renew — another member is waiting for this title" });
  }
  loan.dueDate = addDays(new Date(loan.dueDate), RENEW_DAYS).toISOString();
  loan.renewed = true;
  save(db);
  res.json(loan);
});

router.post("/:id/mark-paid", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const loan = db.loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  loan.finePaid = true;
  save(db);
  res.json(loan);
});

module.exports = router;
