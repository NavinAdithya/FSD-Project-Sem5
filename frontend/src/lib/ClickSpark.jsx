/*
 * ClickSpark — React Bits (JS-CSS variant)
 * Source: reactbits.dev/animations/click-spark
 * License: MIT — attribution preserved per React Bits license
 * Wraps children and fires a burst of sparks on click
 */
import React, { useRef, useState, useCallback } from "react";
import "./ClickSpark.css";

const SPARK_COUNT = 8;
const SPARK_DISTANCE = 40;

export default function ClickSpark({
  children,
  color = "#C89840",
  className = "",
}) {
  const [sparks, setSparks] = useState([]);
  const idRef = useRef(0);

  const fire = useCallback((e) => {
    // Respect reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const newSparks = Array.from({ length: SPARK_COUNT }, (_, i) => {
      const angle = (i / SPARK_COUNT) * Math.PI * 2;
      const dx = Math.cos(angle) * SPARK_DISTANCE;
      const dy = Math.sin(angle) * SPARK_DISTANCE;
      return { id: ++idRef.current, cx, cy, dx, dy };
    });

    setSparks((prev) => [...prev, ...newSparks]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.some((n) => n.id === s.id)));
    }, 600);
  }, []);

  return (
    <div className={`rr-click-spark-wrap ${className}`} onClick={fire}>
      {children}
      {sparks.map((s) => (
        <span
          key={s.id}
          className="rr-spark"
          style={{
            left: s.cx,
            top: s.cy,
            "--rr-dx": `${s.dx}px`,
            "--rr-dy": `${s.dy}px`,
            "--rr-spark-color": color,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
