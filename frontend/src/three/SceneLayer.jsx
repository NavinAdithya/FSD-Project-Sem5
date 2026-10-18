import React, { lazy, Suspense, useEffect, useState } from "react";

// Start fetching the 3D chunk at boot, in parallel with the session check,
// instead of waiting for React to reach the lazy boundary.
const sceneModule =
  typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? import("./AmbientScene.jsx")
    : null;
const AmbientScene = lazy(() => sceneModule || import("./AmbientScene.jsx"));

function canRender3D() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

/**
 * Fixed background layer. A static painted backdrop is always present;
 * the live WebGL room fades in on top of it once loaded.
 */
export default function SceneLayer({ variant }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(canRender3D()), []);

  return (
    <div className="rr-scene-layer" aria-hidden="true">
      <div className="rr-scene-backdrop" />
      <div className="rr-scene-orb rr-scene-orb-a" />
      <div className="rr-scene-orb rr-scene-orb-b" />
      {enabled && (
        <Suspense fallback={null}>
          <AmbientScene variant={variant} />
        </Suspense>
      )}
    </div>
  );
}
