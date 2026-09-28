import { useState, useEffect } from "react";

/**
 * Tracks the mouse position relative to the viewport.
 * Only active on pointer:fine (desktop) devices.
 */
export function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only track on non-touch devices
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return pos;
}
