import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { BookCard, BookDetail, BookForm } from "../components/BookComponents.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Modal from "../components/Modal.jsx";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 28 } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.18 } },
};

export default function Catalog({ role, books, reservations, queueSummary, onAdd, onDelete, onReserve }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailBook, setDetailBook] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const categories = useMemo(() => Array.from(new Set(books.map((b) => b.category))), [books]);

  const filtered = books.filter((b) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.callNumber.toLowerCase().includes(q);
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
    <section className="rr-screen">
      <header className="rr-header rr-header-row">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            Catalog
          </motion.h1>
          <p>{role === "librarian" ? "Every title in the collection, filed by call number." : "Browse the collection and reserve a title if every copy is out."}</p>
        </div>
        {role === "librarian" && (
          <motion.button
            className="rr-btn rr-btn-primary"
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Plus size={15} /> Add book
          </motion.button>
        )}
      </header>

      {/* Search */}
      <motion.div
        className={`rr-search ${searchFocused ? "rr-search-focused" : ""}`}
        animate={{ boxShadow: searchFocused ? "0 0 0 4px rgba(212,165,90,0.16), 0 18px 40px -18px rgba(212,165,90,0.35)" : "none" }}
      >
        <Search size={15} strokeWidth={1.75} />
        <input
          placeholder="Search by title, author, category or call number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          aria-label="Search catalog"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              className="rr-search-clear"
              onClick={() => setQuery("")}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              aria-label="Clear search"
            >
              ×
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Category chips */}
      {categories.length > 1 && (
        <div className="rr-chip-row" role="group" aria-label="Filter by category">
          <motion.button
            layout
            className={`rr-chip ${categoryFilter === "All" ? "is-active" : ""}`}
            onClick={() => setCategoryFilter("All")}
          >
            All
          </motion.button>
          {categories.map((c) => (
            <motion.button
              key={c}
              layout
              className={`rr-chip ${categoryFilter === c ? "is-active" : ""}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </motion.button>
          ))}
        </div>
      )}

      {/* Book grid */}
      {filtered.length === 0 ? (
        <EmptyState
          text={books.length === 0 ? "The catalog is empty. Add the first title." : "No titles match that search."}
        />
      ) : (
        <motion.div
          key={categoryFilter + query}
          className="rr-card-grid"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((b) => {
              const q = queueInfo(b.id);
              return (
                <motion.div key={b.id} variants={cardVariants} layout exit="exit">
                  <BookCard
                    book={b}
                    role={role}
                    queueLength={q.length}
                    myQueuePosition={q.myPosition}
                    onOpen={() => setDetailBook(b)}
                    onDelete={() => onDelete(b.id)}
                    onReserve={() => onReserve(b.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
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
