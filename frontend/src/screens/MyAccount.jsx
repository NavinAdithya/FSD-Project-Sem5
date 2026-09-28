import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Bookmark, Clock, Banknote, RefreshCw, X, AlertTriangle } from "lucide-react";
import StatCard from "../components/StatCard.jsx";
import DueSoonBanner from "../components/DueSoonBanner.jsx";
import EmptyState from "../components/EmptyState.jsx";

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function isOverdue(loan) {
  return !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
}

function daysUntil(d) {
  return Math.ceil(
    (new Date(new Date(d).toDateString()) - new Date(new Date().toDateString())) / 86400000
  );
}

// Due-date progress ring component
function DueDateRing({ dueDate, loanPeriod = 14 }) {
  const days = daysUntil(dueDate);
  const total = loanPeriod;
  const pct = Math.max(0, Math.min(1, days / total));
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = days < 0 ? "var(--rr-danger)" : days <= 3 ? "var(--rr-warning)" : "var(--rr-success)";

  return (
    <svg width={40} height={40} aria-hidden="true" className="rr-due-ring">
      <circle cx={20} cy={20} r={r} stroke="var(--rr-line)" strokeWidth={3} fill="none" />
      <circle
        cx={20} cy={20} r={r}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.8s var(--rr-ease-out)" }}
      />
      <text x={20} y={24} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
        {days < 0 ? "!" : `${days}d`}
      </text>
    </svg>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, x: 15, transition: { duration: 0.2 } },
};

const statContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

export default function MyAccount({ member, books, loans, queueSummary, onRenew, onLoadReservations, onCancelReservation, addToast }) {
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
    <section className="rr-screen">
      <header className="rr-header">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          My account
        </motion.h1>
        <p>{member.name} · {member.memberId} · {member.role}</p>
      </header>

      <DueSoonBanner loans={loans} books={books} />

      <motion.div
        className="rr-stat-row rr-stat-row-narrow"
        variants={statContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Active loans"   value={active.length}           icon={Repeat}   />
        <StatCard label="Reservations"   value={myReservations.length}   icon={Bookmark} />
        <StatCard label="Fines owed"     value={unpaidFines}             icon={Banknote} prefix="₹" tone={unpaidFines > 0 ? "danger" : "default"} />
      </motion.div>

      {/* Currently borrowed */}
      <div className="rr-panel">
        <div className="rr-panel-head"><Repeat size={15} strokeWidth={1.75} /><h2>Currently borrowed</h2></div>
        {active.length === 0 ? (
          <EmptyState text="You don't have anything checked out." />
        ) : (
          <table className="rr-ledger rr-ledger-wide" aria-label="Currently borrowed books">
            <thead><tr><th>Book</th><th>Due</th><th>Progress</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <AnimatePresence>
                {active.map((l, i) => {
                  const book = bookById(l.bookId);
                  const overdue = isOverdue(l);
                  const reservedByOthers = (queueSummary[l.bookId]?.length || 0) > 0;
                  return (
                    <motion.tr
                      key={l.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={overdue ? "is-overdue" : ""}
                    >
                      <td>{book ? book.title : "—"}</td>
                      <td>{fmtDate(l.dueDate)}</td>
                      <td><DueDateRing dueDate={l.dueDate} /></td>
                      <td>{overdue ? <span className="rr-tag rr-tag-danger">Overdue</span> : <span className="rr-tag rr-tag-active">On loan</span>}</td>
                      <td>
                        <button
                          className="rr-btn rr-btn-small"
                          disabled={l.renewed || reservedByOthers}
                          title={l.renewed ? "Already renewed once" : reservedByOthers ? "Someone is waiting for this title" : "Extend the due date"}
                          onClick={() => onRenew(l.id)}
                          aria-label={`Renew ${book?.title || "book"}`}
                        >
                          <RefreshCw size={13} /> Renew
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Reservations */}
      <div className="rr-panel">
        <div className="rr-panel-head"><Bookmark size={15} strokeWidth={1.75} /><h2>My reservations</h2></div>
        {loadingReservations ? (
          <EmptyState text="Loading…" />
        ) : myReservations.length === 0 ? (
          <EmptyState text="You haven't reserved anything." />
        ) : (
          <table className="rr-ledger" aria-label="My reservations">
            <thead><tr><th>Book</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {myReservations.map((r) => {
                  const book = bookById(r.bookId);
                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 15, transition: { duration: 0.2 } }}
                    >
                      <td>{book ? book.title : "—"}</td>
                      <td>{fmtDate(r.requestDate)}</td>
                      <td>
                        <button className="rr-btn rr-btn-small" onClick={() => handleCancel(r.id)} aria-label={`Cancel reservation for ${book?.title || "book"}`}>
                          <X size={13} /> Cancel
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Past loans */}
      <div className="rr-panel">
        <div className="rr-panel-head"><Clock size={15} strokeWidth={1.75} /><h2>Past loans</h2></div>
        {past.length === 0 ? (
          <EmptyState text="No returned loans yet." />
        ) : (
          <table className="rr-ledger" aria-label="Past loans">
            <thead><tr><th>Book</th><th>Returned</th><th>Fine</th></tr></thead>
            <tbody>
              {past.map((l, i) => {
                const book = bookById(l.bookId);
                return (
                  <motion.tr
                    key={l.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <td>{book ? book.title : "—"}</td>
                    <td>{fmtDate(l.returnDate)}</td>
                    <td>{l.fineAmount > 0 ? `₹${l.fineAmount} ${l.finePaid ? "(paid)" : "(unpaid)"}` : "—"}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
