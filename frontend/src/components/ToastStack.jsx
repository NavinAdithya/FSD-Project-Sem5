import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  warn: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "var(--rr-success)",
  warn:    "var(--rr-danger)",
  warning: "var(--rr-danger)",
  info:    "var(--rr-accent)",
};

function Toast({ toast, onDismiss }) {
  const Icon = toast.icon || ICONS[toast.type] || Info;
  const color = COLORS[toast.type] || "var(--rr-accent)";
  const AUTO_DISMISS_MS = 3600;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`rr-toast rr-toast-${toast.type || "info"}`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <span className="rr-toast-msg">{toast.message}</span>
      {/* Auto-dismiss progress bar */}
      <div className="rr-toast-progress" style={{ "--rr-toast-dur": `${AUTO_DISMISS_MS}ms` }} />
      <button
        className="rr-toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="rr-toast-stack" aria-label="Notifications" role="region">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
