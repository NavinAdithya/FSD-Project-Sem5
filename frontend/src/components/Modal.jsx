import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ title, children, onClose, variant = "scale" }) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.22 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
  };

  const modalVariants = {
    scale: {
      hidden: { opacity: 0, scale: 0.90, y: 12 },
      visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
      exit: { opacity: 0, scale: 0.93, y: 8, transition: { duration: 0.18 } },
    },
    flip: {
      hidden: { opacity: 0, rotateY: -18, scale: 0.92 },
      visible: { opacity: 1, rotateY: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 24 } },
      exit: { opacity: 0, rotateY: 12, scale: 0.94, transition: { duration: 0.2 } },
    },
  }[variant] || {};

  return createPortal(
    <AnimatePresence mode="wait">
      {!closing && (
        <motion.div
          className="rr-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
          style={{ perspective: "1000px" }}
        >
          <motion.div
            className="rr-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="rr-modal-head">
              <h3 className="rr-modal-title">{title}</h3>
              <button className="rr-icon-btn" onClick={handleClose} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>
            <div className="rr-modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
