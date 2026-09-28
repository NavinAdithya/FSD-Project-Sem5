const express = require("express");
const { load } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const isOverdue = (loan) => !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());

router.get("/stats", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const totalCopies = db.books.reduce((s, b) => s + Number(b.totalCopies || 0), 0);
  const availableCopies = db.books.reduce((s, b) => s + Number(b.availableCopies || 0), 0);
  const activeLoans = db.loans.filter((l) => !l.returnDate);
  const overdue = activeLoans.filter(isOverdue);
  const outstandingFines = db.loans.reduce((s, l) => s + (l.fineAmount && !l.finePaid ? l.fineAmount : 0), 0);
  res.json({
    titles: db.books.length,
    totalCopies,
    availableCopies,
    borrowed: activeLoans.length,
    overdue: overdue.length,
    members: db.members.length,
    outstandingFines,
  });
});

router.get("/categories", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const counts = {};
  db.loans.forEach((l) => {
    const book = db.books.find((b) => b.id === l.bookId);
    if (!book) return;
    counts[book.category] = (counts[book.category] || 0) + 1;
  });
  res.json(Object.entries(counts).map(([category, count]) => ({ category, count })));
});

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/csv", requireAuth, requireRole("librarian"), (req, res) => {
  const db = load();
  const bookById = (id) => db.books.find((b) => b.id === id);
  const memberById = (id) => db.members.find((m) => m.id === id);
  const header = ["Call Number", "Book Title", "Member ID", "Member Name", "Role", "Issue Date", "Due Date", "Return Date", "Status", "Fine", "Fine Paid"];
  const rows = [...db.loans]
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
    .map((l) => {
      const book = bookById(l.bookId);
      const member = memberById(l.memberId);
      const status = l.returnDate ? "Returned" : isOverdue(l) ? "Overdue" : "On loan";
      return [
        book ? book.callNumber : "",
        book ? book.title : "",
        member ? member.memberId : "",
        member ? member.name : "",
        member ? member.role : "",
        l.issueDate,
        l.dueDate,
        l.returnDate || "",
        status,
        l.fineAmount || 0,
        l.fineAmount ? (l.finePaid ? "Paid" : "Unpaid") : "—",
      ];
    });
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=loan-history.csv");
  res.send(csv);
});

module.exports = router;
