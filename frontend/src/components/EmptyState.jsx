import React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function EmptyState({ text, icon: Icon = BookOpen }) {
  return (
    <motion.div
      className="rr-empty"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Icon size={20} strokeWidth={1.5} className="rr-empty-icon" />
      <p>{text}</p>
    </motion.div>
  );
}
