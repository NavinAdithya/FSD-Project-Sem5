import React from "react";
import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp.js";
import SpotlightCard from "../lib/SpotlightCard.jsx";

export default function StatCard({ label, value, sub, prefix = "", suffix = "", icon: Icon, tone = "default" }) {
  const display = useCountUp(Number(value) || 0);

  const spotColor =
    tone === "danger"
      ? "rgba(156, 58, 58, 0.20)"
      : "rgba(107, 66, 184, 0.16)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`rr-stat rr-stat-${tone}`}
      style={tone === "danger" && value > 0 ? { animation: "rr-pulse-glow 2s ease-in-out infinite" } : {}}
    >
      <SpotlightCard spotlightColor={spotColor} className="rr-stat-inner">
        <Icon size={16} strokeWidth={1.75} className="rr-stat-icon" />
        <div className="rr-stat-value">
          {prefix}<span>{display}</span>{suffix}
        </div>
        <div className="rr-stat-label">{label}</div>
        {sub && <div className="rr-stat-sub">{sub}</div>}
      </SpotlightCard>
    </motion.div>
  );
}
