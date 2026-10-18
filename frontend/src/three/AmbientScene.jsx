import React, { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";

/**
 * AmbientScene — one persistent WebGL layer behind the whole app.
 *
 * Books are built like real hardcovers: two cover boards overhanging a
 * page block, a rounded spine with raised bands and a label, paper-line
 * page edges (some gilded) and a tooled gold frame on the front board.
 * Every book shares the same unit geometry and per-leather materials, so
 * the whole shelf costs a handful of materials and ~100 draw calls.
 *
 * variant="gate": books frame the sign-in screen at 60 fps.
 * variant="app":  the room recedes and renders at 30 fps so the glass UI
 *                 on top stays smooth.
 */

/* ── unit book dimensions (scaled per book) ─────────────── */
const W = 1.05;   // width incl. spine
const H = 1.5;    // height
const D = 0.3;    // thickness
const R = D / 2;  // spine radius
const BOARD = 0.034;
const OVER = 0.035; // board overhang past the page block

const LEATHERS = [
  { cover: "#5B1F1E", label: "#1E1A16", foil: "#D9B06A", gilt: true },  // oxblood
  { cover: "#1E3A2F", label: "#5B1F1E", foil: "#D9B571", gilt: false }, // bottle green
  { cover: "#1B2742", label: "#6A4626", foil: "#C9A15E", gilt: false }, // midnight navy
  { cover: "#6A4626", label: "#1E3A2F", foil: "#E2C28A", gilt: true },  // tan calf
  { cover: "#26252C", label: "#5B1F1E", foil: "#D4A55A", gilt: false }, // charcoal cloth
  { cover: "#163A3E", label: "#24242B", foil: "#CFAE6F", gilt: false }, // deep teal
  { cover: "#CBBE9F", label: "#5B1F1E", foil: "#8A6A37", gilt: false }, // vellum
  { cover: "#3A1C34", label: "#1E1A16", foil: "#D8B272", gilt: true },  // plum
];

function rand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/* ── procedural textures (built once) ───────────────────── */
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function makeTextures() {
  // leather grain: soft cellular noise used as bump + roughness
  const grain = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = rand(i + 1) * w;
      const y = rand(i + 2) * h;
      const r = 1 + rand(i + 3) * 3.2;
      const v = 90 + rand(i + 4) * 90;
      g.fillStyle = `rgba(${v},${v},${v},0.35)`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(2, 3);

  // page edges: hundreds of fine sheet lines
  const pages = (base, line) =>
    canvasTexture(512, 8, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 2) {
        const a = 0.08 + rand(x) * 0.22;
        g.fillStyle = `rgba(${line},${a})`;
        g.fillRect(x, 0, 1, h);
      }
    });
  const paperU = pages("#EADFC6", "120,100,70");
  const giltU = pages("#C99A4E", "90,60,20");
  const toV = (t) => {
    const c = t.clone();
    c.center.set(0.5, 0.5);
    c.rotation = Math.PI / 2;
    c.needsUpdate = true;
    return c;
  };

  // tooled frame + centre ornament for the front board (alpha mask)
  const tooling = canvasTexture(256, 360, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#fff";
    g.fillStyle = "#fff";
    g.lineWidth = 3;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.lineWidth = 1.5;
    g.strokeRect(28, 28, w - 56, h - 56);
    // ornament
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(w / 2, h * 0.56, 26, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h * 0.56, 7, 0, Math.PI * 2);
    g.fill();
    // title lines
    g.fillRect(w * 0.26, h * 0.22, w * 0.48, 7);
    g.fillRect(w * 0.34, h * 0.22 + 16, w * 0.32, 4);
  });

  return { grain, paperU, paperV: toV(paperU), giltU, giltV: toV(giltU), tooling };
}

/* ── shared geometry (built once) ───────────────────────── */
function makeGeometry() {
  const coverW = W - R;
  const spine = new THREE.CylinderGeometry(R, R, H, 32, 1, true, Math.PI, Math.PI);
  const bandParts = [-0.36, -0.12, 0.12, 0.36].map((k) => {
    const b = new THREE.CylinderGeometry(R * 1.06, R * 1.06, 0.035, 32, 1, true, Math.PI, Math.PI);
    b.translate(0, H * k, 0);
    return b;
  });
  const bands = mergeGeometries(bandParts);
  const label = new THREE.CylinderGeometry(R * 1.035, R * 1.035, H * 0.14, 32, 1, true, Math.PI, Math.PI);
  const pages = new THREE.BoxGeometry(coverW - OVER - 0.01, H - OVER * 2, D - BOARD * 2 - 0.004);
  const decor = new THREE.PlaneGeometry(coverW * 0.86, H * 0.9);
  const board = new RoundedBoxGeometry(coverW, H, BOARD, 3, 0.012);
  return { coverW, spine, bands, label, pages, decor, board };
}

const leatherCache = new Map();
function leatherMaterials(leather, tex) {
  if (leatherCache.has(leather.cover)) return leatherCache.get(leather.cover);
  const cover = new THREE.MeshPhysicalMaterial({
    color: leather.cover,
    roughness: 0.68,
    roughnessMap: tex.grain,
    bumpMap: tex.grain,
    bumpScale: 0.9,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.55,
    sheen: 0.5,
    sheenColor: new THREE.Color(leather.foil),
    sheenRoughness: 0.85,
    side: THREE.DoubleSide,
  });
  const label = new THREE.MeshStandardMaterial({
    color: leather.label,
    roughness: 0.55,
    bumpMap: tex.grain,
    bumpScale: 0.5,
    side: THREE.DoubleSide,
  });
  const foil = new THREE.MeshStandardMaterial({
    color: leather.foil,
    metalness: 1,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const tooling = new THREE.MeshStandardMaterial({
    color: leather.foil,
    metalness: 1,
    roughness: 0.34,
    alphaMap: tex.tooling,
    transparent: true,
    depthWrite: false,
  });
  // BoxGeometry face order: +x (fore-edge), -x, +y (top), -y (bottom), +z, -z
  const edgeU = leather.gilt ? tex.giltU : tex.paperU;
  const edgeV = leather.gilt ? tex.giltV : tex.paperV;
  const edgeProps = leather.gilt ? { metalness: 0.85, roughness: 0.32 } : { metalness: 0, roughness: 0.92 };
  const fore = new THREE.MeshStandardMaterial({ map: edgeU, ...edgeProps });
  const topBottom = new THREE.MeshStandardMaterial({ map: edgeV, ...edgeProps });
  const hidden = new THREE.MeshStandardMaterial({ color: "#E3D7BD", roughness: 0.95 });
  const pages = [fore, hidden, topBottom, topBottom, hidden, hidden];
  const mats = { cover, label, foil, tooling, pages };
  leatherCache.set(leather.cover, mats);
  return mats;
}

function Book({ seed, base, leather, scale, thick, geo, tex }) {
  const ref = useRef();
  const m = useMemo(() => leatherMaterials(leather, tex), [leather, tex]);
  const phase = rand(seed) * Math.PI * 2;
  const speed = 0.1 + rand(seed + 1) * 0.14;
  const spin = (rand(seed + 2) - 0.5) * 0.16;
  const drift = 0.14 + rand(seed + 3) * 0.22;
  const coverX = -W / 2 + R + geo.coverW / 2;
  const boardZ = D / 2 - BOARD / 2;

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * speed + phase;
    g.position.set(
      base.pos[0] + Math.sin(t * 0.9) * drift,
      base.pos[1] + Math.cos(t * 0.7) * drift * 0.9,
      base.pos[2] + Math.sin(t * 0.5) * drift * 0.6
    );
    g.rotation.set(
      base.rot[0] + Math.sin(t * 0.6) * 0.16,
      base.rot[1] + t * spin,
      base.rot[2] + Math.cos(t * 0.5) * 0.1
    );
  });

  return (
    <group ref={ref} scale={[scale, scale, scale * thick]}>
      {/* front + back boards */}
      <mesh geometry={geo.board} material={m.cover} position={[coverX, 0, boardZ]} />
      <mesh geometry={geo.board} material={m.cover} position={[coverX, 0, -boardZ]} />
      {/* rounded spine, raised bands, leather label */}
      <mesh geometry={geo.spine} material={m.cover} position={[-W / 2 + R, 0, 0]} />
      <mesh geometry={geo.bands} material={m.cover} position={[-W / 2 + R, 0, 0]} />
      <mesh geometry={geo.label} material={m.label} position={[-W / 2 + R, H * 0.24, 0]} />
      {/* page block */}
      <mesh geometry={geo.pages} material={m.pages} position={[coverX - OVER / 2 + 0.005, 0, 0]} />
      {/* tooled gold frame on the front board */}
      <mesh geometry={geo.decor} material={m.tooling} position={[coverX + 0.01, 0, D / 2 + 0.0015]} />
    </group>
  );
}

/* ── dust motes: round, twinkling, animated entirely on the GPU ── */
function Dust({ count }) {
  const mat = useRef();
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand(i + 11) - 0.5) * 24;
      positions[i * 3 + 1] = (rand(i + 23) - 0.5) * 14;
      positions[i * 3 + 2] = -rand(i + 37) * 14 + 2;
      seeds[i] = rand(i + 51);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color("#F2DBAA") }, uPixel: { value: 1 } }),
    []
  );

  useFrame(({ clock, gl }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixel.value = gl.getPixelRatio();
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          uniform float uTime;
          uniform float uPixel;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            float speed = 0.06 + aSeed * 0.16;
            p.y = mod(p.y + uTime * speed + 7.0, 14.0) - 7.0;
            p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (34.0 + aSeed * 56.0) * uPixel / -mv.z;
            vAlpha = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 60.0));
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, a * a * vAlpha * 0.7);
          }
        `}
      />
    </points>
  );
}

/* ── layout: scatter books in screen space, keeping the copy column clear ── */
function useBooks(count, aspect) {
  return useMemo(() => {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(21));
    const list = [];
    let tries = 0;
    let i = 0;
    while (list.length < count && tries < 1500) {
      tries++;
      const u = rand(tries * 3 + 1) * 2.1 - 1.05;  // screen-space x  (-1 … 1 = edges)
      const v = rand(tries * 3 + 2) * 2.1 - 1.05;  // screen-space y
      const z = -1.5 - rand(tries * 3 + 3) * 4.5;
      // keep the headline / copy column clear, and don't waste books
      // behind the sign-in card where the glass would hide them
      const inCopy = u > -0.92 && u < -0.02 && v > -0.72 && v < 0.8;
      const inCard = u > 0.2 && u < 0.92 && v > -0.58 && v < 0.58;
      const inCenter = Math.abs(u) < 0.2 && Math.abs(v) < 0.35;
      if (inCopy || inCard || inCenter) continue;
      const halfH = (8 - z) * tanHalf;
      const pos = [u * halfH * aspect, v * halfH, z];
      if (list.some((b) => Math.hypot(b.base.pos[0] - pos[0], b.base.pos[1] - pos[1], b.base.pos[2] - pos[2]) < 1.7)) continue;
      list.push({
        seed: i + 1,
        base: {
          pos,
          rot: [rand(i + 19) * 0.9 - 0.45, rand(i + 21) * Math.PI * 2, rand(i + 29) * 0.7 - 0.35],
        },
        leather: LEATHERS[i % LEATHERS.length],
        scale: 0.62 + rand(i + 13) * 0.42,
        thick: 0.8 + rand(i + 31) * 0.7,
      });
      i++;
    }
    return list;
  }, [count, aspect]);
}

function Rig({ variant, children }) {
  const group = useRef();
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.pow(0.02, dt);
    const inApp = variant === "app";
    const g = group.current;
    if (g) {
      const depth = inApp ? -5.5 : 0;
      const scale = inApp ? 1.35 : 1;
      g.position.z += (depth - g.position.z) * k * 0.6;
      g.scale.setScalar(g.scale.x + (scale - g.scale.x) * k * 0.6);
      g.rotation.y += ((state.pointer.x * Math.PI) / 20 - g.rotation.y) * k;
      g.rotation.x += ((-state.pointer.y * Math.PI) / 30 - g.rotation.x) * k;
      g.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.04;
    }
    const t = state.clock.elapsedTime;
    target.current.set(Math.sin(t * 0.07) * 0.35, Math.cos(t * 0.05) * 0.2, 8);
    camera.position.lerp(target.current, k * 0.5);
    camera.lookAt(0, 0, -2);
  });

  return <group ref={group}>{children}</group>;
}

function Lights({ variant }) {
  const key = useRef();
  useFrame((_, delta) => {
    const k = 1 - Math.pow(0.05, Math.min(delta, 0.05));
    const goal = variant === "app" ? 45 : 110;
    if (key.current) key.current.intensity += (goal - key.current.intensity) * k;
  });
  return (
    <>
      <ambientLight intensity={0.28} color="#9DB4D0" />
      <hemisphereLight args={["#AFC3DC", "#2A1D0E", 0.7]} />
      {/* warm reading-lamp key */}
      <spotLight ref={key} position={[6, 7, 6]} angle={0.6} penumbra={0.95} intensity={110} decay={1.6} distance={42} color="#FFD9A0" />
      {/* cold moonlight rim */}
      <directionalLight position={[-6, 3, -8]} intensity={1.6} color="#9DB4D0" />
      <pointLight position={[-6, 2, 4]} intensity={14} distance={18} color="#FFCF8A" />
      <pointLight position={[-4, -3, 3]} intensity={8} distance={14} color="#D4A55A" />
      {/* static studio reflections — rendered once, no network */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#FFE2B0" position={[4, 5, 3]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#9DB4D0" position={[-5, 1, -4]} scale={[4, 6, 1]} />
        <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, -4, 4]} scale={3} />
      </Environment>
    </>
  );
}

/**
 * Drives rendering in "demand" mode: 60 fps on the gate and while the camera
 * is travelling between variants, then 30 fps inside the app. Halving the
 * redraws there halves the work the glass on top has to recomposite.
 */
function FrameDriver({ variant }) {
  const { invalidate } = useThree();
  const boostUntil = useRef(0);

  useEffect(() => {
    boostUntil.current = performance.now() + 2600;
  }, [variant]);

  useEffect(() => {
    let raf;
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const fps = variant === "gate" || now < boostUntil.current ? 60 : 30;
      if (now - last >= 1000 / fps - 2) {
        last = now;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [variant, invalidate]);

  return null;
}

export default function AmbientScene({ variant = "gate" }) {
  const [visible, setVisible] = useState(() => !document.hidden);
  const [dpr, setDpr] = useState(1.25);
  const compact = window.innerWidth < 768;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const books = useBooks(compact ? 9 : 19, aspect);
  const tex = useMemo(makeTextures, []);
  const geo = useMemo(makeGeometry, []);

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className="rr-scene" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 42 }}
        dpr={dpr}
        frameloop={visible ? "demand" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        eventSource={document.body}
        eventPrefix="client"
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <PerformanceMonitor
          flipflops={2}
          bounds={() => (variant === "app" ? [24, 29] : [48, 58])}
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))}
        />
        {visible && <FrameDriver variant={variant} />}
        <fog attach="fog" args={["#07080C", 9, 26]} />
        <Lights variant={variant} />
        <Rig variant={variant}>
          {books.map((b) => (
            <Book key={b.seed} {...b} geo={geo} tex={tex} />
          ))}
        </Rig>
        <Dust count={compact ? 400 : 1100} />
      </Canvas>
    </div>
  );
}
