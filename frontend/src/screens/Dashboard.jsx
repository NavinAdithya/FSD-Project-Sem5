import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, BookMarked, Repeat, AlertTriangle, Users, Banknote, Clock, TrendingUp, Award,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import StatCard, { GaugeCard } from "../components/StatCard.jsx";
import DueSoonBanner from "../components/DueSoonBanner.jsx";
import EmptyState from "../components/EmptyState.jsx";

const fmtDate = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function isOverdue(loan) {
  return !loan.returnDate && new Date(loan.dueDate) < new Date(new Date().toDateString());
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.35 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const bentoVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
});

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rr-chart-tip">
      <div className="rr-chart-tip-label">{label}</div>
      <div className="rr-chart-tip-value">{payload[0].value} loan{payload[0].value === 1 ? "" : "s"}</div>
    </div>
  );
}

export default function Dashboard({ stats, books, members, loans }) {
  const bookById = (id) => books.find((b) => b.id === id);
  const memberById = (id) => members.find((m) => m.id === id);

  const recent = [...loans]
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
    .slice(0, 6);

  const categoryData = useMemo(() => {
    const counts = {};
    loans.forEach((l) => {
      const book = bookById(l.bookId);
      if (!book) return;
      counts[book.category] = (counts[book.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, books]);

  const topTitles = useMemo(() => {
    const counts = {};
    loans.forEach((l) => { counts[l.bookId] = (counts[l.bookId] || 0) + 1; });
    return Object.entries(counts)
      .map(([bookId, count]) => ({ book: bookById(bookId), count }))
      .filter((t) => t.book)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, books]);

  const onTime = useMemo(() => {
    const returned = loans.filter((l) => l.returnDate);
    if (!returned.length) return null;
    const ok = returned.filter(
      (l) => new Date(new Date(l.returnDate).toDateString()) <= new Date(new Date(l.dueDate).toDateString())
    );
    return Math.round((ok.length / returned.length) * 100);
  }, [loans]);

  const maxCount = categoryData.length ? categoryData[0].count : 0;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="rr-screen rr-dashboard">
      <header className="rr-header rr-header-hero">
        <motion.div className="rr-eyebrow" {...reveal(0)}>
          <span className="rr-eyebrow-dot" /> {today}
        </motion.div>
        <motion.h1 {...reveal(0.06)}>
          The desk, <em>at a glance.</em>
        </motion.h1>
        <motion.p {...reveal(0.14)}>
          What's on the shelves, what's out, and who needs a reminder.
        </motion.p>
      </header>

      <DueSoonBanner loans={loans} books={books} />

      {/* Bento */}
      <motion.div className="rr-bento" variants={bentoVariants} initial="hidden" animate="visible">
        <GaugeCard
          label="Copies on shelf"
          value={stats.availableCopies}
          total={stats.totalCopies}
          caption={`${stats.totalCopies - stats.availableCopies} out with readers right now`}
        />
        <StatCard label="Titles catalogued"  value={stats.titles}   icon={BookOpen} />
        <StatCard label="Currently borrowed" value={stats.borrowed} icon={Repeat} />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? "danger" : "default"}
          sub={stats.overdue > 0 ? "Past their due date" : "Everything on time"}
        />
        <StatCard label="Members" value={stats.members} icon={Users} />
        <StatCard
          label="Outstanding fines"
          value={stats.outstandingFines}
          icon={Banknote}
          prefix="₹"
          tone={stats.outstandingFines > 0 ? "danger" : "default"}
        />
        <StatCard
          label="On-time returns"
          value={onTime ?? 0}
          suffix={onTime === null ? "" : "%"}
          icon={TrendingUp}
          sub={onTime === null ? "No returns yet" : "Of every book brought back"}
        />
      </motion.div>

      {/* Chart + ranking */}
      <div className="rr-split">
        <motion.div className="rr-panel rr-panel-chart" {...reveal(0.3)}>
          <div className="rr-panel-head">
            <BookMarked size={15} strokeWidth={1.5} />
            <h2>Loans by category</h2>
            <span className="rr-panel-meta">{loans.length} loans on record</span>
          </div>
          {categoryData.length === 0 ? (
            <EmptyState text="No circulation yet — trends appear once books start moving." />
          ) : (
            <div className="rr-chart-wrap">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
                  <defs>
                    <linearGradient id="rr-bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0D39C" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#B9843A" stopOpacity={0.35} />
                    </linearGradient>
                    <linearGradient id="rr-bar-dim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E6C285" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#E6C285" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "#A9A49A" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#928D83" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(212,165,90,0.06)", radius: 10 }} />
                  <Bar dataKey="count" name="Loans" radius={[10, 10, 4, 4]} animationDuration={1200} animationEasing="ease-out">
                    {categoryData.map((d) => (
                      <Cell key={d.category} fill={d.count === maxCount ? "url(#rr-bar)" : "url(#rr-bar-dim)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div className="rr-panel rr-panel-rank" {...reveal(0.38)}>
          <div className="rr-panel-head">
            <Award size={15} strokeWidth={1.5} />
            <h2>Most borrowed</h2>
          </div>
          {topTitles.length === 0 ? (
            <EmptyState text="Rankings appear after the first loans." />
          ) : (
            <ol className="rr-rank">
              {topTitles.map((t, i) => (
                <motion.li
                  key={t.book.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="rr-rank-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="rr-rank-body">
                    <span className="rr-rank-title">{t.book.title}</span>
                    <span className="rr-rank-author">{t.book.author}</span>
                  </span>
                  <span className="rr-rank-count">{t.count}×</span>
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>
      </div>

      {/* Recent circulation */}
      <motion.div className="rr-panel" {...reveal(0.45)}>
        <div className="rr-panel-head">
          <Clock size={15} strokeWidth={1.5} />
          <h2>Recent circulation</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState text="No loans yet. Issue a book from the Circulation desk to see activity here." />
        ) : (
          <div className="rr-table-scroll">
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
                      <td className="rr-cell-strong">{book ? book.title : "—"}</td>
                      <td>{m ? m.name : "—"}</td>
                      <td className="rr-num">{fmtDate(l.issueDate)}</td>
                      <td className="rr-num">{fmtDate(l.dueDate)}</td>
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
          </div>
        )}
      </motion.div>
    </section>
  );
}
