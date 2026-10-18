import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, X } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const panelVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function ReservationsPanel({ reservations, books, members, onCancel }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);

  const grouped = useMemo(() => {
    const byBook = {};
    [...reservations]
      .sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate))
      .forEach((r) => {
        byBook[r.bookId] = byBook[r.bookId] || [];
        byBook[r.bookId].push(r);
      });
    return byBook;
  }, [reservations]);

  const bookIds = Object.keys(grouped);

  return (
    <section className="rr-screen">
      <header className="rr-header">
        <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          Reservations
        </motion.h1>
        <p>Members waiting for a title that's fully checked out.</p>
      </header>

      {bookIds.length === 0 ? (
        <EmptyState text="No one is waiting on a title right now." />
      ) : (
        <AnimatePresence>
          {bookIds.map((bookId, i) => {
            const book = bookById(bookId);
            const queue = grouped[bookId];
            return (
              <motion.div
                key={bookId}
                className="rr-panel"
                custom={i}
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              >
                <div className="rr-panel-head">
                  <Bookmark size={15} strokeWidth={1.75} />
                  <h2>{book ? `${book.callNumber} — ${book.title}` : "Unknown title"}</h2>
                </div>
                <table className="rr-ledger rr-ledger-wide" aria-label={`Reservation queue for ${book?.title || "unknown"}`}>
                  <thead>
                    <tr><th>Position</th><th>Member</th><th>Requested</th><th></th></tr>
                  </thead>
                  <tbody>
                    {queue.map((r, idx) => {
                      const m = memberById(r.memberId);
                      return (
                        <tr key={r.id}>
                          <td>
                            <span className="rr-queue-badge">#{idx + 1}</span>
                          </td>
                          <td>{m ? `${m.memberId} — ${m.name}` : "—"}</td>
                          <td>{fmtDate(r.requestDate)}</td>
                          <td>
                            <button className="rr-btn rr-btn-small" onClick={() => onCancel(r.id)} aria-label={`Cancel reservation for ${m?.name || "member"}`}>
                              <X size={13} /> Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </section>
  );
}
