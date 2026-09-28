/**
 * READING ROOM — App.jsx (Bibliotheca Aurora Redesign)
 * 
 * All business logic and state remain identical to the original.
 * The render tree now delegates to new components/screens.
 * Zero functional regressions from the original App.jsx.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, ShieldCheck, UserCircle,
  Repeat, Bookmark, Banknote, Loader2, RefreshCw, X
} from "lucide-react";

import { api } from "./api.js";
import "./styles.css";

// ── Components ──────────────────────────────────────────────
import ToastStack     from "./components/ToastStack.jsx";
import LoginGate      from "./components/LoginGate.jsx";
import NavRail        from "./components/NavRail.jsx";
import CursorGlow     from "./components/CursorGlow.jsx";
import Noise          from "./lib/Noise.jsx";

// ── Screens ─────────────────────────────────────────────────
import Dashboard        from "./screens/Dashboard.jsx";
import Catalog          from "./screens/Catalog.jsx";
import Members          from "./screens/Members.jsx";
import Circulation      from "./screens/Circulation.jsx";
import ReservationsPanel from "./screens/ReservationsPanel.jsx";
import FinesPanel       from "./screens/FinesPanel.jsx";
import MyAccount        from "./screens/MyAccount.jsx";

// ── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const isOverdue = (loan) =>
  !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());

const uid = (p) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

/* ============================================================
   Root — App
   All state lives here, exactly as in the original.
   ============================================================ */
export default function App() {
  // ── Auth state ──────────────────────────────────────────
  const [sessionChecked, setSessionChecked] = useState(false);
  const [role, setRole] = useState(null); // 'librarian' | 'member' | null
  const [librarianName, setLibrarianName] = useState("");
  const [member, setMember] = useState(null);

  // ── Domain data ─────────────────────────────────────────
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);           // librarian: all loans; member: their own
  const [reservations, setReservations] = useState([]); // librarian: all reservations
  const [queueSummary, setQueueSummary] = useState({}); // member: { [bookId]: {length, myPosition} }

  // ── UI state ────────────────────────────────────────────
  const [tab, setTab] = useState("dashboard");
  const [dataLoading, setDataLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Toasts ───────────────────────────────────────────────
  const addToast = useCallback((message, type = "info", icon) => {
    const id = uid("t");
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Data loaders ─────────────────────────────────────────
  const loadLibrarianData = async () => {
    setDataLoading(true);
    try {
      const [b, m, l, r] = await Promise.all([
        api.getBooks(), api.getMembers(), api.getLoans(), api.getReservations(),
      ]);
      setBooks(b);
      setMembers(m);
      setLoans(l);
      setReservations(r);
    } finally {
      setDataLoading(false);
    }
  };

  const loadMemberData = async () => {
    setDataLoading(true);
    try {
      const [b, l, q] = await Promise.all([
        api.getBooks(), api.getMyLoans(), api.getQueueSummary(),
      ]);
      setBooks(b);
      setLoans(l);
      setQueueSummary(q);
    } finally {
      setDataLoading(false);
    }
  };

  const refreshQueueSummary = async () => {
    try {
      setQueueSummary(await api.getQueueSummary());
    } catch (_) {}
  };

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      if (!api.hasToken()) { setSessionChecked(true); return; }
      try {
        const me = await api.me();
        if (me.role === "librarian") {
          setRole("librarian");
          setLibrarianName(me.name);
          await loadLibrarianData();
        } else {
          setRole("member");
          setMember(me.member);
          await loadMemberData();
        }
      } catch (_) {
        api.setToken(null);
      } finally {
        setSessionChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ─────────────────────────────────────────
  const doLibrarianLogin = async (username, password) => {
    const res = await api.librarianLogin(username, password);
    api.setToken(res.token);
    setRole("librarian");
    setLibrarianName(res.name);
    await loadLibrarianData();
    addToast(`Welcome back, ${res.name}`, "success", ShieldCheck);
  };

  const doMemberLogin = async (memberId, password) => {
    const res = await api.memberLogin(memberId, password);
    api.setToken(res.token);
    setRole("member");
    setMember(res.member);
    await loadMemberData();
    addToast(`Welcome, ${res.member.name}`, "success", UserCircle);
  };

  const doMemberRegister = async (data) => {
    const res = await api.memberRegister(data);
    api.setToken(res.token);
    setRole("member");
    setMember(res.member);
    await loadMemberData();
    addToast(`Registered — welcome, ${res.member.name}`, "success", UserCircle);
  };

  const signOut = () => {
    api.setToken(null);
    setRole(null);
    setLibrarianName("");
    setMember(null);
    setBooks([]);
    setMembers([]);
    setLoans([]);
    setReservations([]);
    setQueueSummary({});
    setTab("dashboard");
  };

  // ── Derived stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCopies = books.reduce((s, b) => s + Number(b.totalCopies || 0), 0);
    const availableCopies = books.reduce((s, b) => s + Number(b.availableCopies || 0), 0);
    const activeLoans = loans.filter((l) => !l.returnDate);
    const overdue = activeLoans.filter(isOverdue);
    const outstandingFines = loans.reduce(
      (s, l) => s + (l.fineAmount && !l.finePaid ? l.fineAmount : 0), 0
    );
    return {
      titles: books.length,
      totalCopies,
      availableCopies,
      borrowed: activeLoans.length,
      overdue: overdue.length,
      members: members.length,
      outstandingFines,
    };
  }, [books, members, loans]);

  // ── Catalog actions ───────────────────────────────────────
  const addBook = async (data) => {
    try {
      const book = await api.addBook(data);
      setBooks((prev) => [...prev, book]);
      addToast(`Added "${book.title}" to the catalog`, "success", CheckCircle2);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const deleteBook = async (id) => {
    try {
      await api.deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setReservations((prev) => prev.filter((r) => r.bookId !== id));
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  // ── Member actions ────────────────────────────────────────
  const addMember = async (data) => {
    try {
      const m = await api.addMember(data);
      setMembers((prev) => [...prev, m]);
      addToast(`Registered ${m.name}`, "success", CheckCircle2);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const deleteMember = async (id) => {
    try {
      await api.deleteMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setReservations((prev) => prev.filter((r) => r.memberId !== id));
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  // ── Circulation actions ───────────────────────────────────
  const issueBook = async (bookId, memberId, days) => {
    try {
      const loan = await api.issueLoan(bookId, memberId, days);
      const book = books.find((b) => b.id === bookId);
      const m = members.find((mm) => mm.id === memberId);
      setLoans((prev) => [loan, ...prev]);
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, availableCopies: b.availableCopies - 1 } : b))
      );
      setReservations((prev) =>
        prev.filter((r) => !(r.bookId === bookId && r.memberId === memberId))
      );
      addToast(`Issued "${book ? book.title : "book"}" to ${m ? m.name : "member"}`, "success", Repeat);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const returnBook = async (loanId) => {
    try {
      const updated = await api.returnLoan(loanId);
      const book = books.find((b) => b.id === updated.bookId);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)));
      setBooks((prev) =>
        prev.map((b) => (b.id === updated.bookId ? { ...b, availableCopies: b.availableCopies + 1 } : b))
      );
      if (updated.fineAmount > 0) {
        addToast(`Returned "${book ? book.title : "book"}" — ₹${updated.fineAmount} fine applied`, "warn", Banknote);
      } else {
        addToast(`Returned "${book ? book.title : "book"}"`, "success", CheckCircle2);
      }
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const renewLoan = async (loanId) => {
    try {
      const updated = await api.renewLoan(loanId);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)));
      addToast(`Renewed — new due date ${fmtDate(updated.dueDate)}`, "success", RefreshCw);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const markFinePaid = async (loanId) => {
    try {
      const updated = await api.markFinePaid(loanId);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)));
      addToast("Marked fine as paid", "success", CheckCircle2);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  // ── Reservation actions ────────────────────────────────────
  const reserveBook = async (bookId) => {
    try {
      await api.reserveBook(bookId);
      const book = books.find((b) => b.id === bookId);
      addToast(`Reserved "${book ? book.title : "title"}"`, "info", Bookmark);
      if (role === "member") await refreshQueueSummary();
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  const cancelReservation = async (id) => {
    try {
      await api.cancelReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      addToast("Reservation cancelled", "info", X);
      if (role === "member") await refreshQueueSummary();
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  // ── Tab gating ────────────────────────────────────────────
  const librarianTabs = ["dashboard", "catalog", "members", "circulation", "reservations", "fines"];
  const memberTabs    = ["catalog", "account"];
  const allowedTabs   = role === "librarian" ? librarianTabs : memberTabs;
  const effectiveTab  = allowedTabs.includes(tab) ? tab : allowedTabs[0];

  /* ==========================================================
     Render — loading splash
     ========================================================== */
  if (!sessionChecked) {
    return (
      <div className="rr-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="rr-loading">
          <Loader2 className="rr-spin" size={20} />
          <span>Opening the register…</span>
        </div>
      </div>
    );
  }

  /* ==========================================================
     Render — gate (not logged in)
     ========================================================== */
  if (!role) {
    return (
      <div className="rr-root">
        <CursorGlow />
        <Noise opacity={0.025} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <LoginGate
          onLibrarianLogin={doLibrarianLogin}
          onMemberLogin={doMemberLogin}
          onMemberRegister={doMemberRegister}
        />
      </div>
    );
  }

  /* ==========================================================
     Render — main app shell
     ========================================================== */
  return (
    <div className="rr-root">
      <CursorGlow />
      <Noise opacity={0.025} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <NavRail
        role={role}
        librarianName={librarianName}
        member={member}
        stats={stats}
        tab={effectiveTab}
        onTabChange={(t) => setTab(t)}
        onSignOut={signOut}
      />

      <main className="rr-main">
        {dataLoading ? (
          <div className="rr-loading">
            <Loader2 className="rr-spin" size={18} />
            <span>Loading…</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {effectiveTab === "dashboard" && role === "librarian" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Dashboard stats={stats} books={books} members={members} loans={loans} />
              </motion.div>
            )}

            {effectiveTab === "catalog" && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Catalog
                  role={role}
                  books={books}
                  reservations={reservations}
                  queueSummary={queueSummary}
                  onAdd={addBook}
                  onDelete={deleteBook}
                  onReserve={reserveBook}
                />
              </motion.div>
            )}

            {effectiveTab === "members" && role === "librarian" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Members
                  members={members}
                  loans={loans}
                  onAdd={addMember}
                  onDelete={deleteMember}
                />
              </motion.div>
            )}

            {effectiveTab === "circulation" && role === "librarian" && (
              <motion.div
                key="circulation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Circulation
                  books={books}
                  members={members}
                  loans={loans}
                  reservations={reservations}
                  onIssue={issueBook}
                  onReturn={returnBook}
                  onRenew={renewLoan}
                />
              </motion.div>
            )}

            {effectiveTab === "reservations" && role === "librarian" && (
              <motion.div
                key="reservations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <ReservationsPanel
                  reservations={reservations}
                  books={books}
                  members={members}
                  onCancel={cancelReservation}
                />
              </motion.div>
            )}

            {effectiveTab === "fines" && role === "librarian" && (
              <motion.div
                key="fines"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <FinesPanel
                  loans={loans}
                  books={books}
                  members={members}
                  onMarkPaid={markFinePaid}
                  onExport={() => api.downloadCsv()}
                />
              </motion.div>
            )}

            {effectiveTab === "account" && role === "member" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <MyAccount
                  member={member}
                  books={books}
                  loans={loans}
                  queueSummary={queueSummary}
                  onRenew={renewLoan}
                  onLoadReservations={api.getMyReservations}
                  onCancelReservation={cancelReservation}
                  addToast={addToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
