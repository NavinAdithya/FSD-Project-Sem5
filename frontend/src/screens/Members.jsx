import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import { MemberForm } from "../components/MemberForm.jsx";
import Modal from "../components/Modal.jsx";

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, x: 10, transition: { duration: 0.18 } },
};

export default function Members({ members, loans, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const activeCount = (id) => loans.filter((l) => l.memberId === id && !l.returnDate).length;

  return (
    <section className="rr-screen">
      <header className="rr-header rr-header-row">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            Members
          </motion.h1>
          <p>Students and staff registered to borrow.</p>
        </div>
        <motion.button
          className="rr-btn rr-btn-primary"
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Plus size={15} /> Register member
        </motion.button>
      </header>

      {members.length === 0 ? (
        <EmptyState text="No members registered yet." />
      ) : (
        <div className="rr-panel">
          <table className="rr-ledger rr-ledger-wide" aria-label="Members">
            <thead>
              <tr>
                <th>Member ID</th><th>Name</th><th>Role</th><th>Contact</th><th>Active loans</th><th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {members.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <td className="rr-mono">{m.memberId}</td>
                    <td>{m.name}</td>
                    <td>
                      <span className={`rr-tag ${m.role === "staff" ? "rr-tag-active" : "rr-tag-ok"}`}>
                        {m.role}
                      </span>
                    </td>
                    <td>{m.contact}</td>
                    <td>{activeCount(m.id)}</td>
                    <td>
                      <button
                        className="rr-icon-btn"
                        title="Remove member"
                        onClick={() => onDelete(m.id)}
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Register a member" onClose={() => setShowForm(false)}>
          <MemberForm onSubmit={(data) => { onAdd(data); setShowForm(false); }} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </section>
  );
}
