import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Clock, Bookmark, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import ClickSpark from "../lib/ClickSpark.jsx";

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function isOverdue(loan) {
  return !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, height: 0, overflow: "hidden", transition: { duration: 0.22 } },
};

export default function Circulation({ books, members, loans, reservations, onIssue, onReturn, onRenew }) {
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [days, setDays] = useState(14);
  const [blockedId, setBlockedId] = useState(null);

  const active = loans.filter((l) => !l.returnDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const availableBooks = books.filter((b) => b.availableCopies > 0);
  const reservationsFor = (id) => reservations.filter((r) => r.bookId === id).sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate));
  const selectedQueue = bookId ? reservationsFor(bookId) : [];
  const canIssue = bookId && memberId;

  const handleRenewBlocked = (loanId) => {
    setBlockedId(loanId);
    setTimeout(() => setBlockedId(null), 700);
  };

  return (
    <section className="rr-screen">
      <header className="rr-header">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          Circulation desk
        </motion.h1>
        <p>Issue a title to a member, and check in returns.</p>
      </header>

      {/* Issue panel */}
      <div className="rr-panel rr-issue-panel">
        <div className="rr-panel-head"><Repeat size={15} strokeWidth={1.75} /><h2>Issue a book</h2></div>
        <div className="rr-issue-row">
          <label>Book
            <select value={bookId} onChange={(e) => setBookId(e.target.value)} aria-label="Select a book to issue">
              <option value="">Select a title…</option>
              {availableBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.callNumber} — {b.title} ({b.availableCopies} left)</option>
              ))}
            </select>
          </label>
          <label>Member
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label="Select a member">
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.memberId} — {m.name}</option>
              ))}
            </select>
          </label>
          <label>Loan period (days)
            <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Loan period in days" />
          </label>
          <ClickSpark color="#C89840">
            <motion.button
              className="rr-btn rr-btn-primary"
              disabled={!canIssue}
              onClick={() => { onIssue(bookId, memberId, days); setBookId(""); setMemberId(""); }}
              whileHover={canIssue ? { scale: 1.04, y: -1 } : {}}
              whileTap={canIssue ? { scale: 0.97 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              aria-label="Issue book"
            >
              Issue
            </motion.button>
          </ClickSpark>
        </div>
        {selectedQueue.length > 0 && (
          <div className="rr-inline-note">
            <Bookmark size={12} /> Reserved by {selectedQueue.map((r) => memberById(r.memberId)?.name || "someone").join(", ")} — first in line: {memberById(selectedQueue[0].memberId)?.name || "—"}
          </div>
        )}
        {availableBooks.length === 0 && (
          <div className="rr-inline-note">Every copy in the catalog is currently on loan.</div>
        )}
      </div>

      {/* Active loans */}
      <div className="rr-panel">
        <div className="rr-panel-head"><Clock size={15} strokeWidth={1.75} /><h2>Active loans</h2></div>
        {active.length === 0 ? (
          <EmptyState text="Nothing is currently checked out." />
        ) : (
          <table className="rr-ledger rr-ledger-wide" aria-label="Active loans">
            <thead>
              <tr><th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {active.map((l, i) => {
                  const book = bookById(l.bookId);
                  const m = memberById(l.memberId);
                  const overdue = isOverdue(l);
                  const reservedByOthers = reservationsFor(l.bookId).length > 0;
                  const isBlocked = blockedId === l.id;

                  return (
                    <motion.tr
                      key={l.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className={`${overdue ? "is-overdue" : ""} ${isBlocked ? "rr-shake" : ""}`}
                    >
                      <td>{book ? `${book.callNumber} — ${book.title}` : "—"}</td>
                      <td>{m ? m.name : "—"}</td>
                      <td>{fmtDate(l.issueDate)}</td>
                      <td>{fmtDate(l.dueDate)}</td>
                      <td>
                        {overdue
                          ? <span className="rr-tag rr-tag-danger"><AlertTriangle size={11} /> Overdue</span>
                          : <span className="rr-tag rr-tag-active">On loan</span>}
                      </td>
                      <td>
                        <div className="rr-row-actions">
                          <button
                            className="rr-btn rr-btn-small"
                            disabled={l.renewed || reservedByOthers}
                            title={l.renewed ? "Already renewed once" : reservedByOthers ? "Someone is waiting for this title" : "Extend the due date"}
                            onClick={() => {
                              if (l.renewed || reservedByOthers) {
                                handleRenewBlocked(l.id);
                              } else {
                                onRenew(l.id);
                              }
                            }}
                            aria-label="Renew loan"
                          >
                            <RefreshCw size={13} /> Renew
                          </button>
                          <ClickSpark color="#2E7D52">
                            <button className="rr-btn rr-btn-small" onClick={() => onReturn(l.id)} aria-label="Return book">
                              <CheckCircle2 size={13} /> Return
                            </button>
                          </ClickSpark>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
