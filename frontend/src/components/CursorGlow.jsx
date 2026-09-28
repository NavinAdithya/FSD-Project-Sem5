import React, { useEffect, useState } from "react";
import { useMousePosition } from "../hooks/useMousePosition.js";

export default function CursorGlow() {
  const { x, y } = useMousePosition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only mount on desktop with fine pointer and no reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (isFinePointer && !prefersReduced) {
      setMounted(true);
    }
  }, []);

  if (!mounted || (x === 0 && y === 0)) return null;

  return (
    <div
      className="rr-cursor-glow"
      style={{
        transform: `translate(${x - 175}px, ${y - 175}px)`,
      }}
      aria-hidden="true"
    />
  );
}
