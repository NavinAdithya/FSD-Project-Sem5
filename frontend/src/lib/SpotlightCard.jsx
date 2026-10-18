/*
 * SpotlightCard — React Bits (JS-CSS variant), reworked for smoothness
 * Source: reactbits.dev/components/spotlight-card
 * License: MIT — attribution preserved per React Bits license
 *
 * The rect is cached on enter and CSS variables are written at most once
 * per animation frame.
 */
import React, { useRef } from "react";
import "./SpotlightCard.css";

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(212, 165, 90, 0.14)",
  ...props
}) {
  const cardRef = useRef(null);
  const st = useRef({ rect: null, x: 0, y: 0, raf: 0 });

  const write = () => {
    st.current.raf = 0;
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rr-spot-x", `${st.current.x}px`);
    el.style.setProperty("--rr-spot-y", `${st.current.y}px`);
  };

  const handleEnter = () => {
    const el = cardRef.current;
    if (!el) return;
    st.current.rect = el.getBoundingClientRect();
    el.style.setProperty("--rr-spot-color", spotlightColor);
    el.classList.add("is-lit");
  };

  const handleMove = (e) => {
    const r = st.current.rect;
    if (!r) return;
    st.current.x = e.clientX - r.left;
    st.current.y = e.clientY - r.top;
    if (!st.current.raf) st.current.raf = requestAnimationFrame(write);
  };

  const handleLeave = () => {
    st.current.rect = null;
    cardRef.current?.classList.remove("is-lit");
  };

  return (
    <div
      ref={cardRef}
      className={`rr-spotlight-card ${className}`}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    >
      <div className="rr-spotlight-overlay" aria-hidden="true" />
      {children}
    </div>
  );
}
