import React from "react";
import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp.js";
import SpotlightCard from "../lib/SpotlightCard.jsx";
import TiltedCard from "../lib/TiltedCard.jsx";

const item = {
  hidden: { opacity: 0, y: 26, rotateX: 18 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { type: "spring", stiffness: 140, damping: 20 },
  },
};

export default function StatCard({
  label, value, sub, prefix = "", suffix = "", icon: Icon, tone = "default", className = "",
}) {
  const display = useCountUp(Number(value) || 0);
  const spotColor = tone === "danger" ? "rgba(238, 138, 120, 0.16)" : "rgba(212, 165, 90, 0.14)";

  return (
    <motion.div variants={item} className={`rr-stat-cell ${className}`}>
      <TiltedCard maxTilt={7} scale={1.02} glareColor="rgba(255,236,200,0.10)" className="rr-stat-tilt">
        <div className={`rr-stat rr-stat-${tone}`}>
          <SpotlightCard spotlightColor={spotColor} className="rr-stat-inner">
            <div className="rr-stat-top">
              <span className="rr-stat-icon-wrap"><Icon size={15} strokeWidth={1.5} className="rr-stat-icon" /></span>
              {tone === "danger" && value > 0 && <span className="rr-stat-pulse" aria-hidden="true" />}
            </div>
            <div className="rr-stat-value">
              {prefix}<span>{display}</span>{suffix}
            </div>
            <div className="rr-stat-label">{label}</div>
            {sub && <div className="rr-stat-sub">{sub}</div>}
          </SpotlightCard>
        </div>
      </TiltedCard>
    </motion.div>
  );
}

/** Large card with an animated brass gauge — the bento's anchor. */
export function GaugeCard({ label, value, total, caption }) {
  const display = useCountUp(Number(value) || 0);
  const pct = total ? value / total : 0;
  const R = 74;
  const C = 2 * Math.PI * R;

  return (
    <motion.div variants={item} className="rr-stat-cell rr-bento-hero">
      <TiltedCard maxTilt={5} scale={1.01} glareColor="rgba(255,236,200,0.10)" className="rr-stat-tilt">
        <div className="rr-stat rr-stat-hero">
          <SpotlightCard spotlightColor="rgba(212, 165, 90, 0.14)" className="rr-stat-inner rr-hero-inner">
            <div className="rr-hero-copy">
              <div className="rr-eyebrow rr-eyebrow-sm"><span className="rr-eyebrow-dot" /> Live shelf</div>
              <div className="rr-hero-value">
                <span>{display}</span><small>/ {total}</small>
              </div>
              <div className="rr-stat-label">{label}</div>
              <div className="rr-stat-sub">{caption}</div>
            </div>
            <div className="rr-gauge" aria-hidden="true">
              <svg viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="rr-gauge-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F3D9A6" />
                    <stop offset="100%" stopColor="#B9843A" />
                  </linearGradient>
                </defs>
                <circle cx="90" cy="90" r={R} className="rr-gauge-track" />
                <motion.circle
                  cx="90" cy="90" r={R}
                  className="rr-gauge-fill"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: C * (1 - pct) }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                />
              </svg>
              <div className="rr-gauge-pct">{Math.round(pct * 100)}<span>%</span></div>
            </div>
          </SpotlightCard>
        </div>
      </TiltedCard>
    </motion.div>
  );
}
