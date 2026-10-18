import React from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2 } from "lucide-react";
import TiltedCard from "../lib/TiltedCard.jsx";

const CATEGORIES = ["Computer Science", "Science", "Politics", "History", "Literature", "Mathematics", "Other"];

// Deterministic color from category name
const CAT_COLORS = {
  "Computer Science": { spine: "#2B3E66", glow: "rgba(91,120,180,0.35)" },
  "Science":          { spine: "#1E4A47", glow: "rgba(70,150,140,0.30)" },
  "Politics":         { spine: "#6E2624", glow: "rgba(190,80,70,0.30)" },
  "History":          { spine: "#7A5530", glow: "rgba(212,165,90,0.32)" },
  "Literature":       { spine: "#2C4A36", glow: "rgba(110,170,120,0.30)" },
  "Mathematics":      { spine: "#4A2A44", glow: "rgba(170,110,160,0.30)" },
  "Other":            { spine: "#4A4A52", glow: "rgba(200,200,210,0.22)" },
};

function getCatColor(category) {
  return CAT_COLORS[category] || CAT_COLORS.Other;
}

export function BookCard({ book, role, onDelete, onReserve, onOpen, queueLength, myQueuePosition }) {
  const scarce = book.availableCopies === 0;
  const colors = getCatColor(book.category);

  return (
    <TiltedCard className="rr-book-card-tilt" maxTilt={9} glareColor="rgba(255,236,200,0.12)">
      <div
        className="rr-index-card"
        onClick={onOpen}
        tabIndex={0}
        role="button"
        aria-label={`View details for ${book.title}`}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
      >
        {/* Book spine accent */}
        <div
          className="rr-index-spine"
          style={{ "--rr-spine": colors.spine, "--rr-spine-glow": colors.glow }}
          aria-hidden="true"
        />
        <div className="rr-index-content">
          <div className="rr-index-call">{book.callNumber}</div>
          <div className="rr-index-title">{book.title}</div>
          <div className="rr-index-author">{book.author}</div>
          <div className="rr-index-meta">
            <span>{book.category}</span>
            <span>ISBN {book.isbn}</span>
          </div>
          <div className="rr-index-foot">
            <span className={`rr-tag ${scarce ? "rr-tag-danger" : "rr-tag-ok"}`}>
              {scarce ? "All copies out" : `${book.availableCopies} of ${book.totalCopies} available`}
            </span>
            {role === "librarian" ? (
              <button
                className="rr-icon-btn"
                title="Remove title"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                aria-label={`Delete ${book.title}`}
              >
                <Trash2 size={14} />
              </button>
            ) : scarce ? (
              myQueuePosition
                ? <span className="rr-tag rr-tag-active">Reserved · #{myQueuePosition}</span>
                : (
                  <button
                    className="rr-btn rr-btn-small"
                    onClick={(e) => { e.stopPropagation(); onReserve(); }}
                    aria-label={`Reserve ${book.title}`}
                  >
                    <Bookmark size={13} /> Reserve
                  </button>
                )
            ) : null}
          </div>
          {role === "librarian" && queueLength > 0 && (
            <div className="rr-index-queue">
              {queueLength} member{queueLength > 1 ? "s" : ""} waiting
            </div>
          )}
        </div>
      </div>
    </TiltedCard>
  );
}

export function BookDetail({ book, role, queue, onReserve, onDelete }) {
  const scarce = book.availableCopies === 0;
  return (
    <div className="rr-detail">
      <div className="rr-detail-call">{book.callNumber}</div>
      <h2 className="rr-detail-title">{book.title}</h2>
      <div className="rr-detail-author">{book.author}</div>
      <p className="rr-detail-blurb">
        Filed under {book.category}, shelved at call number {book.callNumber}. ISBN {book.isbn}.{" "}
        {scarce
          ? "Every copy is currently on loan."
          : `${book.availableCopies} of ${book.totalCopies} cop${book.availableCopies === 1 ? "y" : "ies"} available now.`}
      </p>
      {queue.length > 0 && (
        <div className="rr-detail-queue">
          <Bookmark size={13} /> {queue.length} member{queue.length > 1 ? "s" : ""} waiting
        </div>
      )}
      <div className="rr-form-actions">
        {role === "librarian" ? (
          <button className="rr-btn" onClick={onDelete}>
            <Trash2 size={14} /> Remove title
          </button>
        ) : scarce ? (
          queue.myPosition
            ? <span className="rr-tag rr-tag-active">Reserved · position #{queue.myPosition}</span>
            : <button className="rr-btn rr-btn-primary" onClick={onReserve}><Bookmark size={14} /> Reserve this title</button>
        ) : (
          <span className="rr-tag rr-tag-ok">Available at the circulation desk</span>
        )}
      </div>
    </div>
  );
}

export function BookForm({ onSubmit, onCancel }) {
  const [form, setForm] = React.useState({ title: "", author: "", isbn: "", category: "Computer Science", totalCopies: 1 });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.title.trim() && form.author.trim();
  return (
    <form className="rr-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(form); }}>
      <label>Title<input value={form.title} onChange={set("title")} placeholder="e.g. The Pragmatic Programmer" autoFocus /></label>
      <label>Author<input value={form.author} onChange={set("author")} placeholder="e.g. David Thomas" /></label>
      <label>ISBN<input value={form.isbn} onChange={set("isbn")} placeholder="e.g. 9780135957059" /></label>
      <div className="rr-form-row">
        <label>Category
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Copies<input type="number" min="1" value={form.totalCopies} onChange={set("totalCopies")} /></label>
      </div>
      <div className="rr-form-actions">
        <button type="button" className="rr-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="rr-btn rr-btn-primary" disabled={!valid}>Add to catalog</button>
      </div>
    </form>
  );
}
