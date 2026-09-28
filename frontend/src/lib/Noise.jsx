/*
 * Noise (grain) overlay — React Bits (JS-CSS variant)
 * Source: reactbits.dev/components/noise
 * License: MIT — attribution preserved per React Bits license
 */
import React, { useEffect, useState } from "react";
import "./Noise.css";

export default function Noise({
  opacity = 0.035,
  grainSize = 128,
  className = "",
}) {
  const [bgPattern, setBgPattern] = useState("");

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const W = grainSize;
    const H = grainSize;
    canvas.width = W;
    canvas.height = H;

    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 40; // Subtle alpha
    }
    ctx.putImageData(imageData, 0, 0);
    setBgPattern(canvas.toDataURL());
  }, [grainSize]);

  if (!bgPattern) return null;

  return (
    <div
      className={`rr-noise-overlay ${className}`}
      style={{
        opacity,
        backgroundImage: `url(${bgPattern})`,
        backgroundRepeat: "repeat",
      }}
      aria-hidden="true"
    />
  );
}
