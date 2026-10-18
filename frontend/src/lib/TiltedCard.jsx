/*
 * TiltedCard — React Bits (JS-CSS variant), reworked for smoothness
 * Source: reactbits.dev/components/tilted-card
 * License: MIT — attribution preserved per React Bits license
 *
 * Mouse-driven 3D tilt + glare. The rect is measured once on enter, the
 * pointer only updates a target, and one rAF loop eases the card toward it
 * (and back to rest on leave), writing transform/background only.
 */
import React, { useEffect, useRef } from "react";
import "./TiltedCard.css";

const finePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function TiltedCard({
  children,
  className = "",
  maxTilt = 10,
  glareColor = "rgba(255,255,255,0.18)",
  scale = 1.03,
  disabled = false,
  ...props
}) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const state = useRef({ rect: null, tx: 0, ty: 0, ts: 1, x: 0, y: 0, s: 1, gx: 50, gy: 50, raf: 0, active: false });

  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  const loop = () => {
    const st = state.current;
    st.x += (st.tx - st.x) * 0.14;
    st.y += (st.ty - st.y) * 0.14;
    st.s += (st.ts - st.s) * 0.14;
    const card = cardRef.current;
    if (card) {
      card.style.transform = `perspective(900px) rotateX(${st.x.toFixed(3)}deg) rotateY(${st.y.toFixed(3)}deg) scale(${st.s.toFixed(4)})`;
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = st.active ? "1" : "0";
      glareRef.current.style.background = `radial-gradient(circle at ${st.gx}% ${st.gy}%, ${glareColor} 0%, transparent 60%)`;
    }
    const settled =
      !st.active && Math.abs(st.x) < 0.01 && Math.abs(st.y) < 0.01 && Math.abs(st.s - 1) < 0.0005;
    if (settled) {
      if (card) card.style.transform = "";
      card?.classList.remove("is-tilting");
      st.raf = 0;
      return;
    }
    st.raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!state.current.raf) state.current.raf = requestAnimationFrame(loop);
  };

  const handleEnter = () => {
    if (disabled || !finePointer() || !cardRef.current) return;
    state.current.rect = cardRef.current.getBoundingClientRect();
    state.current.active = true;
    state.current.ts = scale;
    cardRef.current.classList.add("is-tilting");
    start();
  };

  const handleMove = (e) => {
    const st = state.current;
    if (!st.active || !st.rect) return;
    const { left, top, width, height } = st.rect;
    const dx = ((e.clientX - left) / width) * 2 - 1;
    const dy = ((e.clientY - top) / height) * 2 - 1;
    st.tx = -dy * maxTilt;
    st.ty = dx * maxTilt;
    st.gx = Math.round(((e.clientX - left) / width) * 100);
    st.gy = Math.round(((e.clientY - top) / height) * 100);
  };

  const handleLeave = () => {
    const st = state.current;
    st.active = false;
    st.tx = 0;
    st.ty = 0;
    st.ts = 1;
    start();
  };

  return (
    <div
      ref={cardRef}
      className={`rr-tilted-card ${className}`}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    >
      <div ref={glareRef} className="rr-tilted-glare" aria-hidden="true" />
      {children}
    </div>
  );
}
