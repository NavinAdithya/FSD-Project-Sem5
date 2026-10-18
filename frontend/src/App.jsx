/**
 * READING ROOM — App.jsx
 *
 * All business logic and state live here; screens are presentational.
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
import SceneLayer     from "./three/SceneLayer.jsx";

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
     Render — one persistent shell. The 3D room is mounted once
     here so signing in moves the camera instead of remounting.
     ========================================================== */
  const pageMotion = {
    initial: { opacity: 0, y: 16, scale: 0.995 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  };

  const screens = {
    dashboard: role === "librarian" && (
      <Dashboard stats={stats} books={books} members={members} loans={loans} />
    ),
    catalog: (
      <Catalog
        role={role}
        books={books}
        reservations={reservations}
        queueSummary={queueSummary}
        onAdd={addBook}
        onDelete={deleteBook}
        onReserve={reserveBook}
      />
    ),
    members: role === "librarian" && (
      <Members members={members} loans={loans} onAdd={addMember} onDelete={deleteMember} />
    ),
    circulation: role === "librarian" && (
      <Circulation
        books={books}
        members={members}
        loans={loans}
        reservations={reservations}
        onIssue={issueBook}
        onReturn={returnBook}
        onRenew={renewLoan}
      />
    ),
    reservations: role === "librarian" && (
      <ReservationsPanel reservations={reservations} books={books} members={members} onCancel={cancelReservation} />
    ),
    fines: role === "librarian" && (
      <FinesPanel
        loans={loans}
        books={books}
        members={members}
        onMarkPaid={markFinePaid}
        onExport={() => api.downloadCsv()}
      />
    ),
    account: role === "member" && (
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
    ),
  };

  let content;
  if (!sessionChecked) {
    content = (
      <div className="rr-splash">
        <Loader2 className="rr-spin" size={18} />
        <span>Opening the register…</span>
      </div>
    );
  } else if (!role) {
    content = (
      <LoginGate
        onLibrarianLogin={doLibrarianLogin}
        onMemberLogin={doMemberLogin}
        onMemberRegister={doMemberRegister}
      />
    );
  } else {
    content = (
      <>
        <NavRail
          role={role}
          librarianName={librarianName}
          member={member}
          stats={stats}
          tab={effectiveTab}
          onTabChange={(t) => setTab(t)}
          onSignOut={signOut}
        />
        <main className="rr-main" id="main">
          <div className="rr-main-inner">
            {dataLoading ? (
              <div className="rr-loading">
                <Loader2 className="rr-spin" size={18} />
                <span>Loading the shelves…</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={effectiveTab} {...pageMotion}>
                  {screens[effectiveTab]}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <div className={`rr-root ${role ? "is-app" : "is-gate"}`}>
      <a className="rr-skip" href="#main">Skip to content</a>
      <SceneLayer variant={role ? "app" : "gate"} />
      <div className="rr-vignette" aria-hidden="true" />
      <CursorGlow />
      <Noise opacity={0.05} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {content}
    </div>
  );
}
