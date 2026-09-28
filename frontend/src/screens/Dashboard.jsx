import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, BookMarked, Repeat, AlertTriangle, Users, Banknote, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import StatCard from "../components/StatCard.jsx";
import DueSoonBanner from "../components/DueSoonBanner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Aurora from "../lib/Aurora.jsx";

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function isOverdue(loan) {
  return !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
};

const cardContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function Dashboard({ stats, books, members, loans }) {
  const recent = [...loans]
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
    .slice(0, 6);

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
    <section className="rr-screen rr-dashboard">
      {/* Aurora background for this screen */}
      <div className="rr-screen-aurora" aria-hidden="true">
        <Aurora
          colorStops={["#4A2C8A", "#1E5C8A", "#2E7D52"]}
          amplitude={0.5}
          speed={0.18}
          blend={0.15}
        />
      </div>

      <header className="rr-header">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          An overview of the collection and who's currently borrowing.
        </motion.p>
      </header>

      <DueSoonBanner loans={loans} books={books} />

      {/* Stats grid */}
      <motion.div
        className="rr-stat-row"
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Titles catalogued"   value={stats.titles}           icon={BookOpen}      />
        <StatCard label="Copies on shelf"     value={stats.availableCopies}  icon={BookMarked}    sub={`of ${stats.totalCopies} total`} />
        <StatCard label="Currently borrowed"  value={stats.borrowed}         icon={Repeat}        />
        <StatCard label="Overdue"             value={stats.overdue}          icon={AlertTriangle} tone={stats.overdue > 0 ? "danger" : "default"} />
        <StatCard label="Members"             value={stats.members}          icon={Users}         />
        <StatCard label="Outstanding fines"   value={stats.outstandingFines} icon={Banknote}      prefix="₹" tone={stats.outstandingFines > 0 ? "danger" : "default"} />
      </motion.div>

      {/* Loans by category chart */}
      <div className="rr-panel">
        <div className="rr-panel-head">
          <BookMarked size={15} strokeWidth={1.75} />
          <h2>Loans by category</h2>
        </div>
        {categoryData.length === 0 ? (
          <EmptyState text="No circulation yet — trends will appear once books start moving." />
        ) : (
          <div className="rr-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,44,138,0.10)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--rr-text-soft)" }} axisLine={{ stroke: "rgba(74,44,138,0.15)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--rr-text-soft)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "var(--rr-surface-strong)",
                    border: "1px solid var(--rr-border)",
                    borderRadius: "10px",
                    fontSize: 12,
                    backdropFilter: "blur(12px)",
                    color: "var(--rr-text)",
                  }}
                  cursor={{ fill: "var(--rr-primary-muted)" }}
                />
                <Bar dataKey="count" name="Loans" fill="var(--rr-primary)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent circulation */}
      <div className="rr-panel">
        <div className="rr-panel-head">
          <Clock size={15} strokeWidth={1.75} />
          <h2>Recent circulation</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState text="No loans yet. Issue a book from the Circulation desk to see activity here." />
        ) : (
          <table className="rr-ledger" aria-label="Recent circulation">
            <thead>
              <tr>
                <th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((l, i) => {
                const book = bookById(l.bookId);
                const m = memberById(l.memberId);
                const overdue = isOverdue(l);
                return (
                  <motion.tr
                    key={l.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className={overdue ? "is-overdue" : ""}
                  >
                    <td>{book ? book.title : "—"}</td>
                    <td>{m ? m.name : "—"}</td>
                    <td>{fmtDate(l.issueDate)}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td>
                      {l.returnDate
                        ? <span className="rr-tag rr-tag-ok">Returned</span>
                        : overdue
                          ? <span className="rr-tag rr-tag-danger">Overdue</span>
                          : <span className="rr-tag rr-tag-active">On loan</span>}
                    </td>
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
