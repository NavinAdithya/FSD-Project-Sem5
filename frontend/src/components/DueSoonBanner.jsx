import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

const REMINDER_WINDOW_DAYS = 3;

function daysUntil(d) {
  return Math.ceil(
    (new Date(new Date(d).toDateString()) - new Date(new Date().toDateString())) / 86400000
  );
}

function isOverdue(loan) {
  return !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
}

export default function DueSoonBanner({ loans, books }) {
  const bookById = (id) => books.find((b) => b.id === id);

  const upcoming = loans.filter((l) => {
    if (l.returnDate || isOverdue(l)) return false;
    const d = daysUntil(l.dueDate);
    return d >= 0 && d <= REMINDER_WINDOW_DAYS;
  });

  return (
    <AnimatePresence>
      {upcoming.length > 0 && (
        <motion.div
          className="rr-banner"
          initial={{ opacity: 0, y: -12, scaleY: 0.92 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          role="alert"
        >
          <Clock size={14} className="rr-banner-icon" />
          <span>
            {upcoming.length} title{upcoming.length > 1 ? "s" : ""} due within {REMINDER_WINDOW_DAYS} days —{" "}
            {upcoming.slice(0, 3).map((l) => bookById(l.bookId)?.title || "—").join(", ")}
            {upcoming.length > 3 ? "…" : ""}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
