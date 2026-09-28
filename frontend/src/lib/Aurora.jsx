/*
 * Aurora Background — React Bits (JS-CSS variant)
 * Source: reactbits.dev/backgrounds/aurora
 * License: MIT — attribution preserved per React Bits license
 * Adapted for Reading Room Design System tokens
 */
import React, { useEffect, useRef } from "react";
import "./Aurora.css";

export default function Aurora({
  colorStops = ["#4A2C8A", "#1E5C8A", "#A0722A"],
  amplitude = 1.0,
  speed = 0.5,
  blend = 0.5,
  className = "",
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced-motion: don't animate
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      const grad = ctx.createLinearGradient(0, 0, width, height);
      colorStops.forEach((c, i) => grad.addColorStop(i / (colorStops.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      // CSS-only fallback
      return;
    }

    let W, H;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = canvas.width = rect.width * Math.min(window.devicePixelRatio, 1.5);
      H = canvas.height = rect.height * Math.min(window.devicePixelRatio, 1.5);
      gl.viewport(0, 0, W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Simple WebGL aurora shader
    const vert = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;
    const frag = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_res;
      uniform vec3 u_c0;
      uniform vec3 u_c1;
      uniform vec3 u_c2;
      uniform float u_amp;
      uniform float u_blend;

      float wave(float x, float t, float freq, float phase) {
        return sin(x * freq + t + phase) * 0.5 + 0.5;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        float t = u_time;

        float w0 = wave(uv.x, t * 0.6, 2.5, 0.0) * u_amp;
        float w1 = wave(uv.x, t * 0.4, 3.2, 1.8) * u_amp;
        float w2 = wave(uv.x, t * 0.8, 1.8, 3.5) * u_amp;

        float b0 = smoothstep(w0 - 0.25, w0 + 0.25, uv.y);
        float b1 = smoothstep(w1 - 0.22, w1 + 0.22, uv.y);
        float b2 = smoothstep(w2 - 0.28, w2 + 0.28, uv.y);

        vec3 col = mix(u_c0, u_c1, b0);
        col = mix(col, u_c2, b1 * 0.7);
        col = mix(col, u_c0 * 0.7 + u_c2 * 0.3, b2 * 0.4);

        float alpha = (1.0 - (b0 * 0.4 + b1 * 0.3 + b2 * 0.3)) * u_blend;
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16)/255;
      const g = parseInt(hex.slice(3,5),16)/255;
      const b = parseInt(hex.slice(5,7),16)/255;
      return [r,g,b];
    };

    const c = colorStops.map(hexToRgb);
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes  = gl.getUniformLocation(prog, "u_res");
    const uC0   = gl.getUniformLocation(prog, "u_c0");
    const uC1   = gl.getUniformLocation(prog, "u_c1");
    const uC2   = gl.getUniformLocation(prog, "u_c2");
    const uAmp  = gl.getUniformLocation(prog, "u_amp");
    const uBlnd = gl.getUniformLocation(prog, "u_blend");

    gl.uniform3fv(uC0, c[0] || [0.29,0.17,0.54]);
    gl.uniform3fv(uC1, c[1] || [0.12,0.36,0.54]);
    gl.uniform3fv(uC2, c[2] || [0.63,0.45,0.17]);
    gl.uniform1f(uAmp, amplitude);
    gl.uniform1f(uBlnd, blend);

    let start = null;
    const draw = (ts) => {
      if (!start) start = ts;
      const t = ((ts - start) / 1000) * speed;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, W, H);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    // Pause when tab hidden
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`rr-aurora-wrap ${className}`}>
      <canvas ref={canvasRef} className="rr-aurora-canvas" />
    </div>
  );
}
