import React, { lazy, Suspense, useEffect, useState } from "react";

const loadScene = () => import("./AmbientScene.jsx");
const AmbientScene = lazy(loadScene);

function canRender3D() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

const idle = (fn, timeout) =>
  "requestIdleCallback" in window
    ? window.requestIdleCallback(fn, { timeout })
    : setTimeout(fn, 50);

/**
 * Fixed background layer.
 *
 * A painted backdrop is on screen from the first frame. The live WebGL room
 * is started only after the page's own entrance animation has played and the
 * browser is idle (code fetched at ~0.9s, mounted at ~1.8s), so the two never compete for the main thread. It then
 * warms up off-screen and fades in (opacity only) once frames are flowing.
 */
export default function SceneLayer({ variant }) {
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canRender3D()) return;
    let cancelled = false;
    // Fetch the 3D code once the first paint and fonts have settled...
    const prefetch = setTimeout(loadScene, 900);
    // ...and mount it only after the entrance animation has fully played.
    const mountAt = setTimeout(() => {
      idle(() => !cancelled && setMount(true), 1200);
    }, 1800);
    return () => {
      cancelled = true;
      clearTimeout(prefetch);
      clearTimeout(mountAt);
    };
  }, []);

  return (
    <div className={`rr-scene-layer ${ready ? "is-ready" : ""}`} aria-hidden="true">
      <div className="rr-scene-backdrop" />
      <div className="rr-scene-orb rr-scene-orb-a" />
      <div className="rr-scene-orb rr-scene-orb-b" />
      {mount && (
        <Suspense fallback={null}>
          <AmbientScene variant={variant} onReady={() => setReady(true)} />
        </Suspense>
      )}
    </div>
  );
}
