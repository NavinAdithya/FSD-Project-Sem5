const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "data", "db.json");

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function seed() {
  const now = new Date().toISOString();

  const books = [
    { id: "b1", title: "Introduction to Algorithms", author: "Cormen, Leiserson, Rivest, Stein", isbn: "9780262033848", category: "Computer Science", callNumber: "COM-001", totalCopies: 4, availableCopies: 3 },
    { id: "b2", title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", category: "Computer Science", callNumber: "COM-002", totalCopies: 3, availableCopies: 3 },
    { id: "b3", title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", category: "Science", callNumber: "SCI-001", totalCopies: 2, availableCopies: 1 },
    { id: "b4", title: "The Prince", author: "Niccolò Machiavelli", isbn: "9780140449150", category: "Politics", callNumber: "POL-001", totalCopies: 2, availableCopies: 2 },
    { id: "b5", title: "Sapiens", author: "Yuval Noah Harari", isbn: "9780062316097", category: "History", callNumber: "HIS-001", totalCopies: 1, availableCopies: 0 },
    { id: "b6", title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", category: "Literature", callNumber: "LIT-001", totalCopies: 2, availableCopies: 2 },
    { id: "b7", title: "Calculus: Early Transcendentals", author: "James Stewart", isbn: "9781285741550", category: "Mathematics", callNumber: "MAT-001", totalCopies: 3, availableCopies: 2 },
    { id: "b8", title: "The Selfish Gene", author: "Richard Dawkins", isbn: "9780198788607", category: "Science", callNumber: "SCI-002", totalCopies: 2, availableCopies: 2 },
    { id: "b9", title: "Guns, Germs, and Steel", author: "Jared Diamond", isbn: "9780393317558", category: "History", callNumber: "HIS-002", totalCopies: 2, availableCopies: 2 },
  ];

  // Loans are dated relative to "today" so overdue/fine status is always live and correct,
  // whenever this seed actually runs.
  const loans = [
    // m1 (Ananya) — active loan, not yet due: good for a live "Renew" demo
    { id: "l1", bookId: "b1", memberId: "m1", issueDate: daysAgo(5), dueDate: daysFromNow(9), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    // m2 (Vikram) — active and OVERDUE: drives the Dashboard "Overdue" stat
    { id: "l2", bookId: "b3", memberId: "m2", issueDate: daysAgo(20), dueDate: daysAgo(6), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    // m1 — returned late, fine already paid: shows a "Paid" row in Fines
    { id: "l3", bookId: "b9", memberId: "m1", issueDate: daysAgo(40), dueDate: daysAgo(26), returnDate: daysAgo(20), fineAmount: 30, finePaid: true, renewed: false },
    // m3 (Priya) — active loan on the only copy of Sapiens: this is *why* b5 has a reservation queue
    { id: "l5", bookId: "b5", memberId: "m3", issueDate: daysAgo(4), dueDate: daysFromNow(10), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    // m2 — returned late, fine UNPAID: shows a "Mark paid" action in Fines
    { id: "l6", bookId: "b6", memberId: "m2", issueDate: daysAgo(25), dueDate: daysAgo(11), returnDate: daysAgo(5), fineAmount: 30, finePaid: false, renewed: false },
    // m3 — active and already renewed once: shows the disabled "Already renewed" state live
    { id: "l7", bookId: "b7", memberId: "m3", issueDate: daysAgo(10), dueDate: daysFromNow(4), returnDate: null, fineAmount: 0, finePaid: true, renewed: true },
  ];

  const reservations = [
    // Two members queued for Sapiens (b5), which is fully checked out — a live reservation queue to demo
    { id: "r1", bookId: "b5", memberId: "m1", requestDate: daysAgo(3) },
    { id: "r2", bookId: "b5", memberId: "m2", requestDate: daysAgo(1) },
  ];

  return {
    librarians: [
      { id: "lib1", username: "librarian", passwordHash: bcrypt.hashSync("librarian123", 10) },
    ],
    members: [
      { id: "m1", memberId: "STU-2041", name: "Ananya Rao", role: "student", contact: "ananya.r@college.edu", passwordHash: bcrypt.hashSync("stu-2041", 10) },
      { id: "m2", memberId: "STU-2042", name: "Vikram Nair", role: "student", contact: "vikram.n@college.edu", passwordHash: bcrypt.hashSync("stu-2042", 10) },
      { id: "m3", memberId: "STF-0091", name: "Dr. Priya Menon", role: "staff", contact: "priya.menon@college.edu", passwordHash: bcrypt.hashSync("stf-0091", 10) },
    ],
    books,
    loans,
    reservations,
    meta: { createdAt: now },
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = seed();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = { load, save, uid };
