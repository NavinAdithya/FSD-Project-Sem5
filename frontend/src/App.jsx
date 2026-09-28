import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  BookMarked,
  Users,
  Repeat,
  Plus,
  Trash2,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Clock,
  Loader2,
  Bookmark,
  Banknote,
  LogOut,
  UserCircle,
  ShieldCheck,
  Download,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "./api.js";
import "./styles.css";

const FINE_PER_DAY = 5;
const REMINDER_WINDOW_DAYS = 3;

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const daysUntil = (d) => Math.ceil((new Date(new Date(d).toDateString()) - new Date(new Date().toDateString())) / 86400000);
const isOverdue = (loan) => !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
const uid = (p) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

const CATEGORIES = ["Computer Science", "Science", "Politics", "History", "Literature", "Mathematics", "Other"];

function useCountUp(target, duration = 650) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const start = prevRef.current;
    const startTime = performance.now();
    let raf;
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return display;
}

/* ============================== App ============================== */

export default function App() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [role, setRole] = useState(null); // 'librarian' | 'member' | null
  const [librarianName, setLibrarianName] = useState("");
  const [member, setMember] = useState(null);

  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]); // librarian: all loans. member: their own loans.
  const [reservations, setReservations] = useState([]); // librarian: all reservations.
  const [queueSummary, setQueueSummary] = useState({}); // member: { [bookId]: {length, myPosition} }

  const [tab, setTab] = useState("dashboard");
  const [dataLoading, setDataLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", icon) => {
    const id = uid("t");
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ---- restore session on load ---- */
  useEffect(() => {
    (async () => {
      if (!api.hasToken()) {
        setSessionChecked(true);
        return;
      }
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
      } catch (e) {
        api.setToken(null);
      } finally {
        setSessionChecked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLibrarianData = async () => {
    setDataLoading(true);
    try {
      const [b, m, l, r] = await Promise.all([api.getBooks(), api.getMembers(), api.getLoans(), api.getReservations()]);
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
      const [b, l, q] = await Promise.all([api.getBooks(), api.getMyLoans(), api.getQueueSummary()]);
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

  /* ---- auth actions ---- */
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

  /* ---- derived stats (librarian) ---- */
  const stats = useMemo(() => {
    const totalCopies = books.reduce((s, b) => s + Number(b.totalCopies || 0), 0);
    const availableCopies = books.reduce((s, b) => s + Number(b.availableCopies || 0), 0);
    const activeLoans = loans.filter((l) => !l.returnDate);
    const overdue = activeLoans.filter(isOverdue);
    const outstandingFines = loans.reduce((s, l) => s + (l.fineAmount && !l.finePaid ? l.fineAmount : 0), 0);
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

  /* ---- catalog actions ---- */
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

  /* ---- member actions ---- */
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

  /* ---- circulation actions (librarian) ---- */
  const issueBook = async (bookId, memberId, days) => {
    try {
      const loan = await api.issueLoan(bookId, memberId, days);
      const book = books.find((b) => b.id === bookId);
      const m = members.find((mm) => mm.id === memberId);
      setLoans((prev) => [loan, ...prev]);
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, availableCopies: b.availableCopies - 1 } : b)));
      setReservations((prev) => prev.filter((r) => !(r.bookId === bookId && r.memberId === memberId)));
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
      setBooks((prev) => prev.map((b) => (b.id === updated.bookId ? { ...b, availableCopies: b.availableCopies + 1 } : b)));
      if (updated.fineAmount > 0) addToast(`Returned "${book ? book.title : "book"}" — ₹${updated.fineAmount} fine applied`, "warn", Banknote);
      else addToast(`Returned "${book ? book.title : "book"}"`, "success", CheckCircle2);
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

  const renewLoan = async (loanId) => {
    try {
      const updated = await api.renewLoan(loanId);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)));
      addToast(`Renewed — new due date ${fmtDate(updated.dueDate)}`, "success", RefreshCw);
    } catch (e) {
      addToast(e.message, "warn", AlertTriangle);
    }
  };

  /* ---- reservation actions ---- */
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

  /* ---- gate ---- */
  if (!sessionChecked) {
    return (
      <div className="lms-root lms-root-gate">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="lms-gate">
          <div className="lms-loading"><Loader2 className="lms-spin" size={20} /><span>Opening the register…</span></div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="lms-root lms-root-gate">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <LoginGate onLibrarianLogin={doLibrarianLogin} onMemberLogin={doMemberLogin} onMemberRegister={doMemberRegister} />
      </div>
    );
  }

  const librarianTabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "catalog", label: "Catalog", icon: BookMarked },
    { key: "members", label: "Members", icon: Users },
    { key: "circulation", label: "Circulation", icon: Repeat },
    { key: "reservations", label: "Reservations", icon: Bookmark },
    { key: "fines", label: "Fines", icon: Banknote },
  ];
  const memberTabs = [
    { key: "catalog", label: "Catalog", icon: BookMarked },
    { key: "account", label: "My Account", icon: UserCircle },
  ];
  const tabs = role === "librarian" ? librarianTabs : memberTabs;
  const effectiveTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <div className="lms-root">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <aside className="lms-rail">
        <div className="lms-brand">
          <div className="lms-brand-mark" aria-hidden="true" />
          <div>
            <div className="lms-brand-title">Reading Room</div>
            <div className="lms-brand-sub">Library Register</div>
          </div>
        </div>
        <nav className="lms-nav">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = effectiveTab === t.key;
            return (
              <button key={t.key} className={`lms-nav-item ${active ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
                <Icon size={17} strokeWidth={1.75} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="lms-rail-foot">
          <div className="lms-rail-who">
            {role === "librarian" ? (<><ShieldCheck size={14} /> {librarianName || "Librarian desk"}</>) : (<><UserCircle size={14} /> {member ? member.name : "Member"}</>)}
          </div>
          <div className="lms-rail-stat">
            <span>{stats.availableCopies}</span> of {stats.totalCopies} copies on the shelf
          </div>
          <button className="lms-nav-item lms-signout" onClick={signOut}>
            <LogOut size={15} strokeWidth={1.75} /> <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="lms-main">
        {dataLoading ? (
          <div className="lms-loading"><Loader2 className="lms-spin" size={20} /><span>Loading the register…</span></div>
        ) : (
          <div key={`${role}-${effectiveTab}`} className="lms-tab-fade">
            {role === "librarian" && effectiveTab === "dashboard" && (
              <Dashboard stats={stats} books={books} members={members} loans={loans} />
            )}
            {effectiveTab === "catalog" && (
              <Catalog
                role={role}
                books={books}
                reservations={reservations}
                queueSummary={queueSummary}
                onAdd={addBook}
                onDelete={deleteBook}
                onReserve={reserveBook}
              />
            )}
            {role === "librarian" && effectiveTab === "members" && (
              <Members members={members} loans={loans} onAdd={addMember} onDelete={deleteMember} />
            )}
            {role === "librarian" && effectiveTab === "circulation" && (
              <Circulation books={books} members={members} loans={loans} reservations={reservations} onIssue={issueBook} onReturn={returnBook} onRenew={renewLoan} />
            )}
            {role === "librarian" && effectiveTab === "reservations" && (
              <ReservationsPanel reservations={reservations} books={books} members={members} onCancel={cancelReservation} />
            )}
            {role === "librarian" && effectiveTab === "fines" && (
              <FinesPanel loans={loans} books={books} members={members} onMarkPaid={markFinePaid} />
            )}
            {role === "member" && effectiveTab === "account" && (
              <MyAccount member={member} books={books} loans={loans} queueSummary={queueSummary} onRenew={renewLoan} onLoadReservations={api.getMyReservations} onCancelReservation={cancelReservation} addToast={addToast} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------- Toasts ---------------------------- */

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="lms-toast-stack">
      {toasts.map((t) => {
        const Icon = t.icon;
        return (
          <div key={t.id} className={`lms-toast lms-toast-${t.type || "info"}`}>
            {Icon && <Icon size={14} />}
            <span>{t.message}</span>
            <button className="lms-toast-close" onClick={() => onDismiss(t.id)}><X size={12} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Login gate ---------------------------- */

function LoginGate({ onLibrarianLogin, onMemberLogin, onMemberRegister }) {
  const [mode, setMode] = useState("choose"); // choose | librarian | member | register
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [lib, setLib] = useState({ username: "librarian", password: "" });
  const [mem, setMem] = useState({ memberId: "", password: "" });
  const [reg, setReg] = useState({ name: "", memberId: "", role: "student", contact: "", password: "" });

  const wrap = (fn) => async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lms-gate">
      <div className="lms-gate-card">
        <div className="lms-brand lms-gate-brand">
          <div className="lms-brand-mark" aria-hidden="true" />
          <div>
            <div className="lms-brand-title lms-gate-title">Reading Room</div>
            <div className="lms-brand-sub lms-gate-sub">Library Register</div>
          </div>
        </div>

        {error && <div className="lms-gate-error"><AlertTriangle size={13} /> {error}</div>}

        {mode === "choose" && (
          <>
            <p className="lms-gate-lede">Who's signing in?</p>
            <button className="lms-gate-option" onClick={() => setMode("librarian")}>
              <ShieldCheck size={18} />
              <div>
                <div className="lms-gate-option-title">Librarian</div>
                <div className="lms-gate-option-sub">Full desk access — catalog, members, circulation, fines</div>
              </div>
            </button>
            <button className="lms-gate-option" onClick={() => setMode("member")}>
              <GraduationCap size={18} />
              <div>
                <div className="lms-gate-option-title">Student or staff</div>
                <div className="lms-gate-option-sub">Browse the catalog, reserve titles, see your own loans</div>
              </div>
            </button>
          </>
        )}

        {mode === "librarian" && (
          <form className="lms-form" onSubmit={wrap(() => onLibrarianLogin(lib.username, lib.password))}>
            <label>Username<input value={lib.username} onChange={(e) => setLib({ ...lib, username: e.target.value })} autoFocus /></label>
            <label>Password<input type="password" value={lib.password} onChange={(e) => setLib({ ...lib, password: e.target.value })} /></label>
            <div className="lms-form-actions">
              <button type="button" className="lms-btn" onClick={() => setMode("choose")}>Back</button>
              <button type="submit" className="lms-btn lms-btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            </div>
            <div className="lms-gate-hint">Demo credentials: librarian / librarian123</div>
          </form>
        )}

        {mode === "member" && (
          <form className="lms-form" onSubmit={wrap(() => onMemberLogin(mem.memberId, mem.password))}>
            <label>Member ID<input value={mem.memberId} onChange={(e) => setMem({ ...mem, memberId: e.target.value })} placeholder="e.g. STU-2041" autoFocus /></label>
            <label>Password<input type="password" value={mem.password} onChange={(e) => setMem({ ...mem, password: e.target.value })} /></label>
            <div className="lms-form-actions">
              <button type="button" className="lms-btn" onClick={() => setMode("choose")}>Back</button>
              <button type="submit" className="lms-btn lms-btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            </div>
            <div className="lms-gate-links">
              <button type="button" className="lms-link" onClick={() => setMode("register")}>New here? Register</button>
            </div>
            <div className="lms-gate-hint">Demo seed members' password is their member ID in lowercase (e.g. stu-2041)</div>
          </form>
        )}

        {mode === "register" && (
          <form className="lms-form" onSubmit={wrap(() => onMemberRegister(reg))}>
            <label>Full name<input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} autoFocus /></label>
            <div className="lms-form-row">
              <label>Member ID<input value={reg.memberId} onChange={(e) => setReg({ ...reg, memberId: e.target.value })} placeholder="e.g. STU-2050" /></label>
              <label>Role
                <select value={reg.role} onChange={(e) => setReg({ ...reg, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </label>
            </div>
            <label>Contact<input value={reg.contact} onChange={(e) => setReg({ ...reg, contact: e.target.value })} placeholder="email or phone" /></label>
            <label>Password<input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} /></label>
            <div className="lms-form-actions">
              <button type="button" className="lms-btn" onClick={() => setMode("member")}>Back</button>
              <button type="submit" className="lms-btn lms-btn-primary" disabled={busy}>{busy ? "Registering…" : "Register & continue"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Due-soon banner --------------------------- */

function DueSoonBanner({ loans, books }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const upcoming = loans.filter((l) => {
    if (l.returnDate || isOverdue(l)) return false;
    const d = daysUntil(l.dueDate);
    return d >= 0 && d <= REMINDER_WINDOW_DAYS;
  });
  if (upcoming.length === 0) return null;
  return (
    <div className="lms-reminder-banner">
      <Clock size={14} />
      <span>
        {upcoming.length} title{upcoming.length > 1 ? "s" : ""} due within {REMINDER_WINDOW_DAYS} days —{" "}
        {upcoming.slice(0, 3).map((l) => bookById(l.bookId)?.title || "—").join(", ")}
        {upcoming.length > 3 ? "…" : ""}
      </span>
    </div>
  );
}

/* --------------------------- Dashboard --------------------------- */

function Dashboard({ stats, books, members, loans }) {
  const recent = [...loans].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)).slice(0, 6);
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);

  const categoryData = useMemo(() => {
    const counts = {};
    loans.forEach((l) => {
      const book = bookById(l.bookId);
      if (!book) return;
      counts[book.category] = (counts[book.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, books]);

  return (
    <section>
      <header className="lms-header"><h1>Dashboard</h1><p>An overview of the collection and who's currently borrowing.</p></header>
      <DueSoonBanner loans={loans} books={books} />
      <div className="lms-stat-row">
        <StatCard label="Titles catalogued" value={stats.titles} icon={BookOpen} />
        <StatCard label="Copies on shelf" value={stats.availableCopies} sub={`of ${stats.totalCopies} total`} icon={BookMarked} />
        <StatCard label="Currently borrowed" value={stats.borrowed} icon={Repeat} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone={stats.overdue > 0 ? "danger" : "default"} />
        <StatCard label="Members" value={stats.members} icon={Users} />
        <StatCard label="Outstanding fines" value={stats.outstandingFines} prefix="₹" icon={Banknote} tone={stats.outstandingFines > 0 ? "danger" : "default"} />
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><BookMarked size={15} strokeWidth={1.75} /><h2>Loans by category</h2></div>
        {categoryData.length === 0 ? (
          <EmptyState text="No circulation yet — trends will appear once books start moving." />
        ) : (
          <div className="lms-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,49,79,0.12)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#5B5F68" }} axisLine={{ stroke: "rgba(34,49,79,0.2)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B5F68" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 8, fontSize: 12, backdropFilter: "blur(8px)" }} cursor={{ fill: "rgba(168,130,60,0.12)" }} />
                <Bar dataKey="count" name="Loans" fill="#A8823C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><Clock size={15} strokeWidth={1.75} /><h2>Recent circulation</h2></div>
        {recent.length === 0 ? (
          <EmptyState text="No loans yet. Issue a book from the Circulation desk to see activity here." />
        ) : (
          <table className="lms-ledger">
            <thead><tr><th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((l) => {
                const book = bookById(l.bookId);
                const m = memberById(l.memberId);
                const overdue = isOverdue(l);
                return (
                  <tr key={l.id}>
                    <td>{book ? book.title : "—"}</td>
                    <td>{m ? m.name : "—"}</td>
                    <td>{fmtDate(l.issueDate)}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td>{l.returnDate ? <span className="lms-tag lms-tag-ok">Returned</span> : overdue ? <span className="lms-tag lms-tag-danger">Overdue</span> : <span className="lms-tag lms-tag-active">On loan</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, sub, prefix = "", suffix = "", icon: Icon, tone = "default" }) {
  const display = useCountUp(Number(value) || 0);
  return (
    <div className={`lms-stat lms-stat-${tone}`}>
      <Icon size={16} strokeWidth={1.75} />
      <div className="lms-stat-value">{prefix}{display}{suffix}</div>
      <div className="lms-stat-label">{label}</div>
      {sub && <div className="lms-stat-sub">{sub}</div>}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="lms-empty">{text}</div>;
}

/* ---------------------------- Catalog ---------------------------- */

function Catalog({ role, books, reservations, queueSummary, onAdd, onDelete, onReserve }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailBook, setDetailBook] = useState(null);

  const categories = useMemo(() => Array.from(new Set(books.map((b) => b.category))), [books]);

  const filtered = books.filter((b) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.callNumber.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "All" || b.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const queueInfo = (bookId) => {
    if (role === "librarian") {
      const queue = reservations.filter((r) => r.bookId === bookId);
      return { length: queue.length, myPosition: null };
    }
    return queueSummary[bookId] || { length: 0, myPosition: null };
  };

  return (
    <section>
      <header className="lms-header lms-header-row">
        <div>
          <h1>Catalog</h1>
          <p>{role === "librarian" ? "Every title in the collection, filed by call number." : "Browse the collection and reserve a title if every copy is out."}</p>
        </div>
        {role === "librarian" && <button className="lms-btn lms-btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add book</button>}
      </header>

      <div className="lms-search">
        <Search size={15} strokeWidth={1.75} />
        <input placeholder="Search by title, author, category or call number" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {categories.length > 1 && (
        <div className="lms-chip-row">
          <button className={`lms-chip ${categoryFilter === "All" ? "is-active" : ""}`} onClick={() => setCategoryFilter("All")}>All</button>
          {categories.map((c) => (
            <button key={c} className={`lms-chip ${categoryFilter === c ? "is-active" : ""}`} onClick={() => setCategoryFilter(c)}>{c}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState text={books.length === 0 ? "The catalog is empty. Add the first title." : "No titles match that search."} />
      ) : (
        <div className="lms-card-grid">
          {filtered.map((b) => {
            const q = queueInfo(b.id);
            return (
              <BookCard key={b.id} book={b} role={role} queueLength={q.length} myQueuePosition={q.myPosition} onOpen={() => setDetailBook(b)} onDelete={() => onDelete(b.id)} onReserve={() => onReserve(b.id)} />
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title="Add a new book" onClose={() => setShowForm(false)}>
          <BookForm onSubmit={(data) => { onAdd(data); setShowForm(false); }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {detailBook && (
        <Modal title="Title details" variant="flip" onClose={() => setDetailBook(null)}>
          <BookDetail
            book={detailBook}
            role={role}
            queue={queueInfo(detailBook.id)}
            onReserve={() => onReserve(detailBook.id)}
            onDelete={() => { onDelete(detailBook.id); setDetailBook(null); }}
          />
        </Modal>
      )}
    </section>
  );
}

function BookCard({ book, role, onDelete, onReserve, onOpen, queueLength, myQueuePosition }) {
  const scarce = book.availableCopies === 0;
  return (
    <div className="lms-index-card" onClick={onOpen}>
      <div className="lms-index-punch" aria-hidden="true" />
      <div className="lms-index-call">{book.callNumber}</div>
      <div className="lms-index-title">{book.title}</div>
      <div className="lms-index-author">{book.author}</div>
      <div className="lms-index-meta"><span>{book.category}</span><span>ISBN {book.isbn}</span></div>
      <div className="lms-index-foot">
        <span className={`lms-tag ${scarce ? "lms-tag-danger" : "lms-tag-ok"}`}>{scarce ? "All copies out" : `${book.availableCopies} of ${book.totalCopies} available`}</span>
        {role === "librarian" ? (
          <button className="lms-icon-btn" title="Remove title" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={14} /></button>
        ) : scarce ? (
          myQueuePosition ? <span className="lms-tag lms-tag-active">Reserved · #{myQueuePosition}</span> : <button className="lms-btn lms-btn-small" onClick={(e) => { e.stopPropagation(); onReserve(); }}><Bookmark size={13} /> Reserve</button>
        ) : null}
      </div>
      {role === "librarian" && queueLength > 0 && <div className="lms-index-queue">{queueLength} member{queueLength > 1 ? "s" : ""} waiting</div>}
    </div>
  );
}

function BookDetail({ book, role, queue, onReserve, onDelete }) {
  const scarce = book.availableCopies === 0;
  return (
    <div className="lms-detail">
      <div className="lms-detail-call">{book.callNumber}</div>
      <h2 className="lms-detail-title">{book.title}</h2>
      <div className="lms-detail-author">{book.author}</div>
      <p className="lms-detail-blurb">
        Filed under {book.category}, shelved at call number {book.callNumber}. ISBN {book.isbn}.
        {" "}{scarce ? " Every copy is currently on loan." : ` ${book.availableCopies} of ${book.totalCopies} cop${book.availableCopies === 1 ? "y" : "ies"} available now.`}
      </p>
      {queue.length > 0 && <div className="lms-detail-queue"><Bookmark size={13} /> {queue.length} member{queue.length > 1 ? "s" : ""} waiting</div>}
      <div className="lms-form-actions">
        {role === "librarian" ? (
          <button className="lms-btn" onClick={onDelete}><Trash2 size={14} /> Remove title</button>
        ) : scarce ? (
          queue.myPosition ? <span className="lms-tag lms-tag-active">Reserved · position #{queue.myPosition}</span> : <button className="lms-btn lms-btn-primary" onClick={onReserve}><Bookmark size={14} /> Reserve this title</button>
        ) : (
          <span className="lms-tag lms-tag-ok">Available at the circulation desk</span>
        )}
      </div>
    </div>
  );
}

function BookForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ title: "", author: "", isbn: "", category: "Computer Science", totalCopies: 1 });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.title.trim() && form.author.trim();
  return (
    <form className="lms-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(form); }}>
      <label>Title<input value={form.title} onChange={set("title")} placeholder="e.g. The Pragmatic Programmer" autoFocus /></label>
      <label>Author<input value={form.author} onChange={set("author")} placeholder="e.g. David Thomas" /></label>
      <label>ISBN<input value={form.isbn} onChange={set("isbn")} placeholder="e.g. 9780135957059" /></label>
      <div className="lms-form-row">
        <label>Category<select value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label>Copies<input type="number" min="1" value={form.totalCopies} onChange={set("totalCopies")} /></label>
      </div>
      <div className="lms-form-actions">
        <button type="button" className="lms-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="lms-btn lms-btn-primary" disabled={!valid}>Add to catalog</button>
      </div>
    </form>
  );
}

/* ---------------------------- Members ---------------------------- */

function Members({ members, loans, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const activeCount = (id) => loans.filter((l) => l.memberId === id && !l.returnDate).length;
  return (
    <section>
      <header className="lms-header lms-header-row">
        <div><h1>Members</h1><p>Students and staff registered to borrow.</p></div>
        <button className="lms-btn lms-btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Register member</button>
      </header>
      {members.length === 0 ? <EmptyState text="No members registered yet." /> : (
        <table className="lms-ledger lms-ledger-wide">
          <thead><tr><th>Member ID</th><th>Name</th><th>Role</th><th>Contact</th><th>Active loans</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="lms-mono">{m.memberId}</td>
                <td>{m.name}</td>
                <td><span className={`lms-tag ${m.role === "staff" ? "lms-tag-active" : "lms-tag-ok"}`}>{m.role}</span></td>
                <td>{m.contact}</td>
                <td>{activeCount(m.id)}</td>
                <td><button className="lms-icon-btn" title="Remove member" onClick={() => onDelete(m.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && (
        <Modal title="Register a member" onClose={() => setShowForm(false)}>
          <MemberForm onSubmit={(data) => { onAdd(data); setShowForm(false); }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </section>
  );
}

function MemberForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: "", memberId: "", role: "student", contact: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim() && form.memberId.trim();
  return (
    <form className="lms-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(form); }}>
      <label>Full name<input value={form.name} onChange={set("name")} placeholder="e.g. Ritika Sharma" autoFocus /></label>
      <div className="lms-form-row">
        <label>Member ID<input value={form.memberId} onChange={set("memberId")} placeholder="e.g. STU-2050" /></label>
        <label>Role<select value={form.role} onChange={set("role")}><option value="student">Student</option><option value="staff">Staff</option></select></label>
      </div>
      <label>Contact<input value={form.contact} onChange={set("contact")} placeholder="email or phone" /></label>
      <div className="lms-form-actions">
        <button type="button" className="lms-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="lms-btn lms-btn-primary" disabled={!valid}>Register</button>
      </div>
      <div className="lms-gate-hint">Default password for this member will be their member ID (lowercase).</div>
    </form>
  );
}

/* -------------------------- Circulation --------------------------- */

function Circulation({ books, members, loans, reservations, onIssue, onReturn, onRenew }) {
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [days, setDays] = useState(14);

  const active = loans.filter((l) => !l.returnDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const availableBooks = books.filter((b) => b.availableCopies > 0);
  const reservationsFor = (id) => reservations.filter((r) => r.bookId === id).sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate));
  const selectedQueue = bookId ? reservationsFor(bookId) : [];
  const canIssue = bookId && memberId;

  return (
    <section>
      <header className="lms-header"><h1>Circulation desk</h1><p>Issue a title to a member, and check in returns.</p></header>
      <div className="lms-panel lms-issue-panel">
        <div className="lms-panel-head"><Repeat size={15} strokeWidth={1.75} /><h2>Issue a book</h2></div>
        <div className="lms-issue-row">
          <label>Book
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">Select a title…</option>
              {availableBooks.map((b) => <option key={b.id} value={b.id}>{b.callNumber} — {b.title} ({b.availableCopies} left)</option>)}
            </select>
          </label>
          <label>Member
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select a member…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.memberId} — {m.name}</option>)}
            </select>
          </label>
          <label>Loan period (days)<input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></label>
          <button className="lms-btn lms-btn-primary" disabled={!canIssue} onClick={() => { onIssue(bookId, memberId, days); setBookId(""); setMemberId(""); }}>Issue</button>
        </div>
        {selectedQueue.length > 0 && (
          <div className="lms-inline-note"><Bookmark size={12} /> Reserved by {selectedQueue.map((r) => memberById(r.memberId)?.name || "someone").join(", ")} — first in line: {memberById(selectedQueue[0].memberId)?.name || "—"}</div>
        )}
        {availableBooks.length === 0 && <div className="lms-inline-note">Every copy in the catalog is currently on loan.</div>}
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><Clock size={15} strokeWidth={1.75} /><h2>Active loans</h2></div>
        {active.length === 0 ? <EmptyState text="Nothing is currently checked out." /> : (
          <table className="lms-ledger lms-ledger-wide">
            <thead><tr><th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {active.map((l) => {
                const book = bookById(l.bookId);
                const m = memberById(l.memberId);
                const overdue = isOverdue(l);
                const reservedByOthers = reservationsFor(l.bookId).length > 0;
                return (
                  <tr key={l.id} className={overdue ? "is-overdue" : ""}>
                    <td>{book ? `${book.callNumber} — ${book.title}` : "—"}</td>
                    <td>{m ? m.name : "—"}</td>
                    <td>{fmtDate(l.issueDate)}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td>{overdue ? <span className="lms-tag lms-tag-danger"><AlertTriangle size={11} /> Overdue</span> : <span className="lms-tag lms-tag-active">On loan</span>}</td>
                    <td>
                      <div className="lms-row-actions">
                        <button className="lms-btn lms-btn-small" disabled={l.renewed || reservedByOthers} title={l.renewed ? "Already renewed once" : reservedByOthers ? "Someone is waiting for this title" : "Extend the due date"} onClick={() => onRenew(l.id)}><RefreshCw size={13} /> Renew</button>
                        <button className="lms-btn lms-btn-small" onClick={() => onReturn(l.id)}><CheckCircle2 size={13} /> Return</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ------------------------- Reservations panel ------------------------- */

function ReservationsPanel({ reservations, books, members, onCancel }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const grouped = useMemo(() => {
    const byBook = {};
    [...reservations].sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate)).forEach((r) => {
      byBook[r.bookId] = byBook[r.bookId] || [];
      byBook[r.bookId].push(r);
    });
    return byBook;
  }, [reservations]);
  const bookIds = Object.keys(grouped);

  return (
    <section>
      <header className="lms-header"><h1>Reservations</h1><p>Members waiting for a title that's fully checked out.</p></header>
      {bookIds.length === 0 ? <EmptyState text="No one is waiting on a title right now." /> : bookIds.map((bookId) => {
        const book = bookById(bookId);
        const queue = grouped[bookId];
        return (
          <div className="lms-panel" key={bookId}>
            <div className="lms-panel-head"><Bookmark size={15} strokeWidth={1.75} /><h2>{book ? `${book.callNumber} — ${book.title}` : "Unknown title"}</h2></div>
            <table className="lms-ledger lms-ledger-wide">
              <thead><tr><th>Position</th><th>Member</th><th>Requested</th><th></th></tr></thead>
              <tbody>
                {queue.map((r, i) => {
                  const m = memberById(r.memberId);
                  return (
                    <tr key={r.id}>
                      <td>#{i + 1}</td>
                      <td>{m ? `${m.memberId} — ${m.name}` : "—"}</td>
                      <td>{fmtDate(r.requestDate)}</td>
                      <td><button className="lms-btn lms-btn-small" onClick={() => onCancel(r.id)}><X size={13} /> Cancel</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

/* ---------------------------- Fines panel ---------------------------- */

function FinesPanel({ loans, books, members, onMarkPaid }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const fined = [...loans].filter((l) => l.fineAmount > 0).sort((a, b) => (a.finePaid === b.finePaid ? 0 : a.finePaid ? 1 : -1));
  const outstanding = fined.filter((l) => !l.finePaid).reduce((s, l) => s + l.fineAmount, 0);

  return (
    <section>
      <header className="lms-header lms-header-row">
        <div><h1>Fines</h1><p>Overdue returns are charged ₹{FINE_PER_DAY} per day late.</p></div>
        <button className="lms-btn" onClick={() => api.downloadCsv()}><Download size={15} /> Export loan history (CSV)</button>
      </header>
      <div className="lms-stat-row lms-stat-row-narrow">
        <StatCard label="Outstanding fines" value={outstanding} prefix="₹" icon={Banknote} tone={outstanding > 0 ? "danger" : "default"} />
        <StatCard label="Fined loans on record" value={fined.length} icon={Clock} />
      </div>
      <div className="lms-panel">
        {fined.length === 0 ? <EmptyState text="No fines on record." /> : (
          <table className="lms-ledger lms-ledger-wide">
            <thead><tr><th>Book</th><th>Member</th><th>Due</th><th>Returned</th><th>Fine</th><th></th></tr></thead>
            <tbody>
              {fined.map((l) => {
                const book = bookById(l.bookId);
                const m = memberById(l.memberId);
                return (
                  <tr key={l.id}>
                    <td>{book ? book.title : "—"}</td>
                    <td>{m ? m.name : "—"}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td>{l.returnDate ? fmtDate(l.returnDate) : "—"}</td>
                    <td>₹{l.fineAmount}</td>
                    <td>{l.finePaid ? <span className="lms-tag lms-tag-ok">Paid</span> : <button className="lms-btn lms-btn-small" onClick={() => onMarkPaid(l.id)}><CheckCircle2 size={13} /> Mark paid</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ---------------------------- My account ---------------------------- */

function MyAccount({ member, books, loans, queueSummary, onRenew, onLoadReservations, onCancelReservation, addToast }) {
  const [myReservations, setMyReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setMyReservations(await onLoadReservations());
      } catch (e) {
        addToast(e.message, "warn", AlertTriangle);
      } finally {
        setLoadingReservations(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async (id) => {
    await onCancelReservation(id);
    setMyReservations((prev) => prev.filter((r) => r.id !== id));
  };

  if (!member) return <EmptyState text="Member profile not found." />;
  const bookById = (id) => books.find((b) => b.id === id);
  const active = loans.filter((l) => !l.returnDate);
  const past = loans.filter((l) => l.returnDate);
  const unpaidFines = loans.filter((l) => l.fineAmount > 0 && !l.finePaid).reduce((s, l) => s + l.fineAmount, 0);

  return (
    <section>
      <header className="lms-header"><h1>My account</h1><p>{member.name} · {member.memberId} · {member.role}</p></header>
      <DueSoonBanner loans={loans} books={books} />
      <div className="lms-stat-row lms-stat-row-narrow">
        <StatCard label="Active loans" value={active.length} icon={Repeat} />
        <StatCard label="Reservations" value={myReservations.length} icon={Bookmark} />
        <StatCard label="Fines owed" value={unpaidFines} prefix="₹" icon={Banknote} tone={unpaidFines > 0 ? "danger" : "default"} />
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><Repeat size={15} strokeWidth={1.75} /><h2>Currently borrowed</h2></div>
        {active.length === 0 ? <EmptyState text="You don't have anything checked out." /> : (
          <table className="lms-ledger lms-ledger-wide">
            <thead><tr><th>Book</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {active.map((l) => {
                const book = bookById(l.bookId);
                const overdue = isOverdue(l);
                const reservedByOthers = (queueSummary[l.bookId]?.length || 0) > 0;
                return (
                  <tr key={l.id} className={overdue ? "is-overdue" : ""}>
                    <td>{book ? book.title : "—"}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td>{overdue ? <span className="lms-tag lms-tag-danger">Overdue</span> : <span className="lms-tag lms-tag-active">On loan</span>}</td>
                    <td><button className="lms-btn lms-btn-small" disabled={l.renewed || reservedByOthers} title={l.renewed ? "Already renewed once" : reservedByOthers ? "Someone is waiting for this title" : "Extend the due date"} onClick={() => onRenew(l.id)}><RefreshCw size={13} /> Renew</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><Bookmark size={15} strokeWidth={1.75} /><h2>My reservations</h2></div>
        {loadingReservations ? <EmptyState text="Loading…" /> : myReservations.length === 0 ? <EmptyState text="You haven't reserved anything." /> : (
          <table className="lms-ledger">
            <thead><tr><th>Book</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {myReservations.map((r) => {
                const book = bookById(r.bookId);
                return (
                  <tr key={r.id}>
                    <td>{book ? book.title : "—"}</td>
                    <td>{fmtDate(r.requestDate)}</td>
                    <td><button className="lms-btn lms-btn-small" onClick={() => handleCancel(r.id)}><X size={13} /> Cancel</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="lms-panel">
        <div className="lms-panel-head"><Clock size={15} strokeWidth={1.75} /><h2>Past loans</h2></div>
        {past.length === 0 ? <EmptyState text="No returned loans yet." /> : (
          <table className="lms-ledger">
            <thead><tr><th>Book</th><th>Returned</th><th>Fine</th></tr></thead>
            <tbody>
              {past.map((l) => {
                const book = bookById(l.bookId);
                return (
                  <tr key={l.id}>
                    <td>{book ? book.title : "—"}</td>
                    <td>{fmtDate(l.returnDate)}</td>
                    <td>{l.fineAmount > 0 ? `₹${l.fineAmount} ${l.finePaid ? "(paid)" : "(unpaid)"}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Modal ------------------------------ */

function Modal({ title, children, onClose, variant = "scale" }) {
  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => { setClosing(true); setTimeout(onClose, 180); }, [onClose]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);
  return (
    <div className={`lms-modal-backdrop ${closing ? "is-closing" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={`lms-modal lms-modal-${variant} ${closing ? "is-closing" : ""}`}>
        <div className="lms-modal-head"><h3>{title}</h3><button className="lms-icon-btn" onClick={handleClose}><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}
