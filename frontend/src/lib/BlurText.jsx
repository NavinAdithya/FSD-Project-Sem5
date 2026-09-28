/*
 * BlurText — React Bits (JS-CSS variant)
 * Source: reactbits.dev/text-animations/blur-text
 * License: MIT — attribution preserved per React Bits license
 * Animates text in word by word with blur + fade
 */
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import "./BlurText.css";

export default function BlurText({
  text = "",
  delay = 0,
  stagger = 0.06,
  className = "",
  as: Tag = "span",
  once = true,
}) {
  const words = useMemo(() => text.split(" "), [text]);

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const wordVariant = {
    hidden: { opacity: 0, filter: "blur(12px)", y: 8 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.span
      className={`rr-blur-text ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
      viewport={once ? { once: true } : undefined}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="rr-blur-word"
          variants={wordVariant}
        >
          {word}
          {i < words.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </motion.span>
  );
}
