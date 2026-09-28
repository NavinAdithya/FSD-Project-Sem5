import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * Procedural Book mesh:
 * Cover + pages + golden spine foil accent
 */
function Book({ position, rotation, color, spineColor, scale = 1, speed = 1 }) {
  const meshRef = useRef();

  // Procedural dimensions for a realistic hardcover book
  const width = 1.2 * scale;
  const height = 1.6 * scale;
  const depth = 0.28 * scale;

  return (
    <Float
      speed={speed * 1.5}
      rotationIntensity={0.6}
      floatIntensity={0.8}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position} rotation={rotation} ref={meshRef}>
        {/* Book cover (outer box) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={color}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>

        {/* Book pages inside (slightly inset white/parchment block) */}
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[width * 0.94, height * 0.94, depth * 0.88]} />
          <meshStandardMaterial
            color="#F7F1E5"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* Spine accent foil strip */}
        <mesh position={[-width / 2 + 0.01, 0, 0]}>
          <boxGeometry args={[0.02, height * 0.99, depth * 1.01]} />
          <meshStandardMaterial
            color={spineColor || "#C89840"}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </group>
    </Float>
  );
}

function SceneGroup() {
  const groupRef = useRef();

  // Soft mouse parallax
  useFrame((state) => {
    if (!groupRef.current) return;
    const targetX = (state.pointer.x * Math.PI) / 10;
    const targetY = (state.pointer.y * Math.PI) / 12;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetX,
      0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -targetY,
      0.05
    );
  });

  // Balanced constellation of books floating at varying depths
  const books = useMemo(
    () => [
      {
        pos: [-3.2, 1.4, -1.5],
        rot: [0.3, 0.4, -0.2],
        color: "#3B206E", // Deep violet
        spine: "#D4AF37", // Gold
        scale: 1.1,
        speed: 1.2,
      },
      {
        pos: [3.4, 1.6, -1.8],
        rot: [-0.2, -0.5, 0.3],
        color: "#1A4971", // Scholarly deep blue
        spine: "#E5C158",
        scale: 1.2,
        speed: 0.9,
      },
      {
        pos: [-3.6, -1.8, -1.2],
        rot: [0.4, 0.6, 0.1],
        color: "#7E2A38", // Crimson leather
        spine: "#C89840",
        scale: 1.0,
        speed: 1.1,
      },
      {
        pos: [3.8, -1.6, -1.0],
        rot: [-0.3, -0.3, -0.2],
        color: "#235B40", // Forest green
        spine: "#D4AF37",
        scale: 1.05,
        speed: 1.3,
      },
      {
        pos: [-1.8, 2.6, -2.5],
        rot: [0.5, 0.2, 0.4],
        color: "#4A2C8A",
        spine: "#F3D58C",
        scale: 0.85,
        speed: 0.8,
      },
      {
        pos: [2.2, 2.7, -2.8],
        rot: [-0.4, 0.5, -0.3],
        color: "#8B4513", // Saddle leather
        spine: "#C89840",
        scale: 0.9,
        speed: 1.0,
      },
      {
        pos: [0, -2.8, -2.0],
        rot: [0.2, -0.6, 0.2],
        color: "#2D1B4E",
        spine: "#E5C158",
        scale: 1.15,
        speed: 1.0,
      },
      {
        pos: [-4.2, 0.1, -3.0],
        rot: [0.1, 0.8, -0.1],
        color: "#1E3A5F",
        spine: "#D4AF37",
        scale: 0.8,
        speed: 0.7,
      },
      {
        pos: [4.4, 0.2, -3.2],
        rot: [-0.2, -0.7, 0.2],
        color: "#5C2945",
        spine: "#E5C158",
        scale: 0.85,
        speed: 0.75,
      },
    ],
    []
  );

  return (
    <group ref={groupRef}>
      {books.map((b, i) => (
        <Book
          key={i}
          position={b.pos}
          rotation={b.rot}
          color={b.color}
          spineColor={b.spine}
          scale={b.scale}
          speed={b.speed}
        />
      ))}
    </group>
  );
}

export default function BookScene() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVis = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        {/* Atmosphere & Scholarly Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.2}
          color="#FFF8E7"
          castShadow
        />
        <pointLight position={[-6, -4, 2]} intensity={0.6} color="#B89BFF" />
        <pointLight position={[6, -4, 2]} intensity={0.4} color="#FFD180" />

        <SceneGroup />
      </Canvas>
    </div>
  );
}
