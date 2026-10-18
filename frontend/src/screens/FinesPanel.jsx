import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote, Clock, CheckCircle2, Download } from "lucide-react";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

const FINE_PER_DAY = 5;

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.22 } },
};

const cardContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function FinesPanel({ loans, books, members, onMarkPaid, onExport }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const fined = [...loans]
    .filter((l) => l.fineAmount > 0)
    .sort((a, b) => (a.finePaid === b.finePaid ? 0 : a.finePaid ? 1 : -1));
  const outstanding = fined.filter((l) => !l.finePaid).reduce((s, l) => s + l.fineAmount, 0);

  return (
    <section className="rr-screen">
      <header className="rr-header rr-header-row">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            Fines
          </motion.h1>
          <p>Overdue returns are charged ₹{FINE_PER_DAY} per day late.</p>
        </div>
        <motion.button
          className="rr-btn"
          onClick={() => (onExport ? onExport() : api.downloadCsv())}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          aria-label="Export loan history as CSV"
        >
          <Download size={15} /> Export loan history (CSV)
        </motion.button>
      </header>

      <motion.div
        className="rr-stat-row rr-stat-row-narrow"
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Outstanding fines" value={outstanding} prefix="₹" icon={Banknote} tone={outstanding > 0 ? "danger" : "default"} />
        <StatCard label="Fined loans on record" value={fined.length} icon={Clock} />
      </motion.div>

      <div className="rr-panel">
        {fined.length === 0 ? (
          <EmptyState text="No fines on record." />
        ) : (
          <table className="rr-ledger rr-ledger-wide" aria-label="Fines">
            <thead>
              <tr><th>Book</th><th>Member</th><th>Due</th><th>Returned</th><th>Fine</th><th></th></tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {fined.map((l, i) => {
                  const book = bookById(l.bookId);
                  const m = memberById(l.memberId);
                  return (
                    <motion.tr
                      key={l.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <td>{book ? book.title : "—"}</td>
                      <td>{m ? m.name : "—"}</td>
                      <td>{fmtDate(l.dueDate)}</td>
                      <td>{l.returnDate ? fmtDate(l.returnDate) : "—"}</td>
                      <td className="rr-fine-amount">₹{l.fineAmount}</td>
                      <td>
                        {l.finePaid ? (
                          <span className="rr-tag rr-tag-ok"><CheckCircle2 size={11} /> Paid</span>
                        ) : (
                          <motion.button
                            className="rr-btn rr-btn-small"
                            onClick={() => onMarkPaid(l.id)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            aria-label={`Mark fine as paid for ${m?.name || "member"}`}
                          >
                            <CheckCircle2 size={13} /> Mark paid
                          </motion.button>
                        )}
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
