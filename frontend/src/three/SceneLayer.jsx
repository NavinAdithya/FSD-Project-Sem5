import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { scrollState } from "./scrollState.js";

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
  const layerRef = useRef(null);

  // Landing page only: feed scroll progress to the rig and dim the room once
  // the hero is passed so body copy stays readable. Writes go straight to a
  // CSS variable and a shared object — never through React state.
  useEffect(() => {
    scrollState.p = 0;
    layerRef.current?.style.setProperty("--rr-dim", "1");
    if (variant !== "gate") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const y = window.scrollY;
      scrollState.p = Math.min(1, y / max);
      const dim = Math.min(1, Math.max(0, (y - vh * 0.25) / (vh * 0.7)));
      layerRef.current?.style.setProperty("--rr-dim", String(1 - dim * 0.45));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [variant]);

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
    <div ref={layerRef} className={`rr-scene-layer ${ready ? "is-ready" : ""}`} aria-hidden="true">
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
