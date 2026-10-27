/**
 * READING ROOM — In-browser mock store for static deployments (e.g. GitHub Pages)
 * when no remote backend URL (VITE_API_BASE) is configured.
 * This guarantees the landing page and demo login NEVER fail with HTTP 405.
 */

const STORAGE_KEY = "lms_static_demo_db";

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

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function getInitialData() {
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

  const loans = [
    { id: "l1", bookId: "b1", memberId: "m1", issueDate: daysAgo(5), dueDate: daysFromNow(9), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    { id: "l2", bookId: "b3", memberId: "m2", issueDate: daysAgo(20), dueDate: daysAgo(6), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    { id: "l3", bookId: "b9", memberId: "m1", issueDate: daysAgo(40), dueDate: daysAgo(26), returnDate: daysAgo(20), fineAmount: 30, finePaid: true, renewed: false },
    { id: "l5", bookId: "b5", memberId: "m3", issueDate: daysAgo(4), dueDate: daysFromNow(10), returnDate: null, fineAmount: 0, finePaid: true, renewed: false },
    { id: "l6", bookId: "b6", memberId: "m2", issueDate: daysAgo(25), dueDate: daysAgo(11), returnDate: daysAgo(5), fineAmount: 30, finePaid: false, renewed: false },
    { id: "l7", bookId: "b7", memberId: "m3", issueDate: daysAgo(10), dueDate: daysFromNow(4), returnDate: null, fineAmount: 0, finePaid: true, renewed: true },
  ];

  const reservations = [
    { id: "r1", bookId: "b5", memberId: "m1", requestDate: daysAgo(3) },
    { id: "r2", bookId: "b5", memberId: "m2", requestDate: daysAgo(1) },
  ];

  const members = [
    { id: "m1", memberId: "STU-2041", name: "Ananya Rao", role: "student", contact: "ananya.r@college.edu", password: "stu-2041" },
    { id: "m2", memberId: "STU-2042", name: "Vikram Nair", role: "student", contact: "vikram.n@college.edu", password: "stu-2042" },
    { id: "m3", memberId: "STF-0091", name: "Dr. Priya Menon", role: "staff", contact: "priya.menon@college.edu", password: "stf-0091" },
  ];

  return {
    librarian: { username: "librarian", password: "librarian123" },
    members,
    books,
    loans,
    reservations,
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const init = getInitialData();
  saveDb(init);
  return init;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (_) {}
}

const CATEGORY_PREFIX = {
  "Computer Science": "COM",
  Science: "SCI",
  Politics: "POL",
  History: "HIS",
  Literature: "LIT",
  Mathematics: "MAT",
  Other: "GEN",
};

export const mockApi = {
  async librarianLogin(username, password) {
    const db = loadDb();
    if (username !== db.librarian.username || password !== db.librarian.password) {
      throw new Error("Invalid librarian credentials (try demo: librarian / librarian123)");
    }
    const token = "mock-librarian-token";
    return { token, role: "librarian", name: "Librarian Desk" };
  },

  async memberLogin(memberId, password) {
    const db = loadDb();
    const mem = db.members.find(
      (m) => m.memberId.toLowerCase() === String(memberId || "").trim().toLowerCase()
    );
    if (!mem || mem.password !== String(password || "").trim()) {
      throw new Error("Invalid member ID or password (try demo: STU-2041 / stu-2041)");
    }
    const token = `mock-member-token-${mem.id}`;
    return { token, role: "member", member: { id: mem.id, memberId: mem.memberId, name: mem.name, role: mem.role, contact: mem.contact } };
  },

  async memberRegister(data) {
    const db = loadDb();
    const memberId = String(data.memberId || "").trim();
    if (db.members.some((m) => m.memberId.toLowerCase() === memberId.toLowerCase())) {
      throw new Error("That member ID is already registered");
    }
    const newMember = {
      id: uid("m"),
      memberId,
      name: String(data.name || "").trim(),
      role: data.role === "staff" ? "staff" : "student",
      contact: String(data.contact || "").trim(),
      password: String(data.password || "").trim(),
    };
    db.members.push(newMember);
    saveDb(db);
    const token = `mock-member-token-${newMember.id}`;
    return { token, role: "member", member: { id: newMember.id, memberId: newMember.memberId, name: newMember.name, role: newMember.role, contact: newMember.contact } };
  },

  async me() {
    const token = localStorage.getItem("lms_token");
    if (!token) throw new Error("Unauthenticated");
    if (token === "mock-librarian-token") {
      return { role: "librarian", name: "Librarian Desk" };
    }
    if (token.startsWith("mock-member-token-")) {
      const memberId = token.replace("mock-member-token-", "");
      const db = loadDb();
      const mem = db.members.find((m) => m.id === memberId);
      if (mem) {
        return { role: "member", member: { id: mem.id, memberId: mem.memberId, name: mem.name, role: mem.role, contact: mem.contact } };
      }
    }
    throw new Error("Session expired");
  },

  async getBooks() {
    return loadDb().books;
  },

  async addBook(data) {
    const db = loadDb();
    const count = db.books.filter((b) => b.callNumber.startsWith(CATEGORY_PREFIX[data.category] || "GEN")).length + 1;
    const callNumber = `${CATEGORY_PREFIX[data.category] || "GEN"}-${String(count).padStart(3, "0")}`;
    const copies = Math.max(1, Number(data.totalCopies) || 1);
    const book = {
      id: uid("b"),
      title: data.title,
      author: data.author,
      isbn: data.isbn || "",
      category: data.category || "Other",
      callNumber,
      totalCopies: copies,
      availableCopies: copies,
    };
    db.books.push(book);
    saveDb(db);
    return book;
  },

  async deleteBook(id) {
    const db = loadDb();
    if (db.loans.some((l) => l.bookId === id && !l.returnDate)) {
      throw new Error("Can't remove a title with an active loan");
    }
    db.books = db.books.filter((b) => b.id !== id);
    db.reservations = db.reservations.filter((r) => r.bookId !== id);
    saveDb(db);
    return true;
  },

  async getMembers() {
    return loadDb().members.map(({ password, ...rest }) => rest);
  },

  async addMember(data) {
    const db = loadDb();
    const member = {
      id: uid("m"),
      memberId: data.memberId,
      name: data.name,
      role: data.role === "staff" ? "staff" : "student",
      contact: data.contact || "",
      password: data.memberId,
    };
    db.members.push(member);
    saveDb(db);
    const { password, ...rest } = member;
    return rest;
  },

  async deleteMember(id) {
    const db = loadDb();
    if (db.loans.some((l) => l.memberId === id && !l.returnDate)) {
      throw new Error("Can't remove a member with an active loan");
    }
    db.members = db.members.filter((m) => m.id !== id);
    db.reservations = db.reservations.filter((r) => r.memberId !== id);
    saveDb(db);
    return true;
  },

  async getLoans() {
    return loadDb().loans;
  },

  async getMyLoans() {
    const me = await this.me();
    return loadDb().loans.filter((l) => l.memberId === me.member.id);
  },

  async issueLoan(bookId, memberId, days) {
    const db = loadDb();
    const book = db.books.find((b) => b.id === bookId);
    if (!book || book.availableCopies < 1) throw new Error("No copies available");
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (Number(days) || 14));
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
    saveDb(db);
    return loan;
  },

  async returnLoan(id) {
    const db = loadDb();
    const loan = db.loans.find((l) => l.id === id);
    if (!loan) throw new Error("Loan not found");
    if (loan.returnDate) throw new Error("Loan already returned");
    const book = db.books.find((b) => b.id === loan.bookId);
    const returnDate = new Date();
    const lateDays = Math.max(0, Math.floor((returnDate - new Date(loan.dueDate)) / 86400000));
    const fineAmount = lateDays * 5;
    loan.returnDate = returnDate.toISOString();
    loan.fineAmount = fineAmount;
    loan.finePaid = fineAmount === 0;
    if (book) book.availableCopies += 1;
    saveDb(db);
    return loan;
  },

  async renewLoan(id) {
    const db = loadDb();
    const loan = db.loans.find((l) => l.id === id);
    if (!loan) throw new Error("Loan not found");
    if (loan.renewed) throw new Error("This loan has already been renewed once");
    if (db.reservations.some((r) => r.bookId === loan.bookId)) {
      throw new Error("Can't renew — another member is waiting for this title");
    }
    const due = new Date(loan.dueDate);
    due.setDate(due.getDate() + 14);
    loan.dueDate = due.toISOString();
    loan.renewed = true;
    saveDb(db);
    return loan;
  },

  async markFinePaid(id) {
    const db = loadDb();
    const loan = db.loans.find((l) => l.id === id);
    if (!loan) throw new Error("Loan not found");
    loan.finePaid = true;
    saveDb(db);
    return loan;
  },

  async getReservations() {
    return loadDb().reservations;
  },

  async getMyReservations() {
    const me = await this.me();
    return loadDb().reservations.filter((r) => r.memberId === me.member.id);
  },

  async getQueueSummary() {
    const db = loadDb();
    let currentMemberId = null;
    try {
      const me = await this.me();
      if (me.role === "member") currentMemberId = me.member.id;
    } catch (_) {}
    const byBook = {};
    db.reservations.forEach((r) => {
      byBook[r.bookId] = byBook[r.bookId] || [];
      byBook[r.bookId].push(r);
    });
    const summary = {};
    Object.entries(byBook).forEach(([bookId, list]) => {
      const sorted = [...list].sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate));
      let myPosition = null;
      if (currentMemberId) {
        const idx = sorted.findIndex((r) => r.memberId === currentMemberId);
        if (idx >= 0) myPosition = idx + 1;
      }
      summary[bookId] = { length: sorted.length, myPosition };
    });
    return summary;
  },

  async reserveBook(bookId) {
    const me = await this.me();
    const db = loadDb();
    if (db.reservations.some((r) => r.bookId === bookId && r.memberId === me.member.id)) {
      throw new Error("You've already reserved this title");
    }
    const reservation = { id: uid("r"), bookId, memberId: me.member.id, requestDate: new Date().toISOString() };
    db.reservations.push(reservation);
    saveDb(db);
    return reservation;
  },

  async cancelReservation(id) {
    const db = loadDb();
    db.reservations = db.reservations.filter((r) => r.id !== id);
    saveDb(db);
    return true;
  },

  async getStats() {
    const db = loadDb();
    const isOverdue = (l) => !l.returnDate && new Date(l.dueDate) < new Date();
    const totalCopies = db.books.reduce((s, b) => s + Number(b.totalCopies || 0), 0);
    const availableCopies = db.books.reduce((s, b) => s + Number(b.availableCopies || 0), 0);
    const activeLoans = db.loans.filter((l) => !l.returnDate);
    const overdue = activeLoans.filter(isOverdue);
    const outstandingFines = db.loans.reduce((s, l) => s + (l.fineAmount && !l.finePaid ? l.fineAmount : 0), 0);
    return {
      titles: db.books.length,
      totalCopies,
      availableCopies,
      borrowed: activeLoans.length,
      overdue: overdue.length,
      members: db.members.length,
      outstandingFines,
    };
  },

  async getCategoryReport() {
    const db = loadDb();
    const counts = {};
    db.loans.forEach((l) => {
      const book = db.books.find((b) => b.id === l.bookId);
      if (book) counts[book.category] = (counts[book.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
  },
};
