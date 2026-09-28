/*
 * TiltedCard — React Bits (JS-CSS variant)
 * Source: reactbits.dev/components/tilted-card
 * License: MIT — attribution preserved per React Bits license
 * Provides mouse-driven 3D tilt + glare on hover
 */
import React, { useRef } from "react";
import "./TiltedCard.css";

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

  const handleMouseMove = (e) => {
    if (disabled || !cardRef.current) return;
    // Skip on touch/low-power
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    const rotX = -dy * maxTilt;
    const rotY = dx * maxTilt;

    cardRef.current.style.transform = `
      perspective(800px)
      rotateX(${rotX}deg)
      rotateY(${rotY}deg)
      scale(${scale})
    `;

    if (glareRef.current) {
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;
      glareRef.current.style.background = `radial-gradient(
        circle at ${glareX}% ${glareY}%,
        ${glareColor} 0%,
        transparent 60%
      )`;
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
    if (glareRef.current) {
      glareRef.current.style.background = "none";
    }
  };

  return (
    <div
      ref={cardRef}
      className={`rr-tilted-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div ref={glareRef} className="rr-tilted-glare" aria-hidden="true" />
      {children}
    </div>
  );
}
