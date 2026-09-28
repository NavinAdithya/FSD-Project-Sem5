/*
 * SpotlightCard — React Bits (JS-CSS variant)
 * Source: reactbits.dev/components/spotlight-card
 * License: MIT — attribution preserved per React Bits license
 */
import React, { useRef } from "react";
import "./SpotlightCard.css";

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(107, 66, 184, 0.18)",
  ...props
}) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--rr-spot-x", `${x}px`);
    cardRef.current.style.setProperty("--rr-spot-y", `${y}px`);
    cardRef.current.style.setProperty("--rr-spot-color", spotlightColor);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--rr-spot-x", "-9999px");
    cardRef.current.style.setProperty("--rr-spot-y", "-9999px");
  };

  return (
    <div
      ref={cardRef}
      className={`rr-spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="rr-spotlight-overlay" aria-hidden="true" />
      {children}
    </div>
  );
}
