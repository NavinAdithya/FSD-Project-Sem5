import React, { useEffect, useRef, useState } from "react";

/**
 * Soft brass light that trails the pointer. Driven by a single rAF loop
 * writing a transform — no React state per mousemove, no layout reads.
 */
export default function CursorGlow() {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const ok =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(ok);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let raf;
    let visible = false;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible && ref.current) {
        visible = true;
        ref.current.style.opacity = "1";
      }
    };
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.16;
      pos.y += (target.y - pos.y) * 0.16;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.x - 175}px, ${pos.y - 175}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className="rr-cursor-glow" style={{ opacity: 0 }} aria-hidden="true" />;
}
