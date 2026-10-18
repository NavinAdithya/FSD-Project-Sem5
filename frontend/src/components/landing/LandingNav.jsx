import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#innovation", label: "What's different" },
  { href: "#how", label: "How it works" },
];

/** Floating glass pill. Appears once the hero has scrolled away. */
export default function LandingNav() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setShow(window.scrollY > window.innerHeight * 0.55);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const go = (e, href) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={`lp-nav ${show ? "is-visible" : ""}`} aria-label="Page sections" aria-hidden={!show}>
      <a className="lp-nav-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} tabIndex={show ? 0 : -1}>
        <span className="lp-nav-logo"><BookOpen size={14} strokeWidth={1.6} /></span>
        Reading Room
      </a>
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} onClick={(e) => go(e, l.href)} tabIndex={show ? 0 : -1}>{l.label}</a>
          </li>
        ))}
      </ul>
      <button type="button" className="lp-nav-cta" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} tabIndex={show ? 0 : -1}>
        Sign in
      </button>
    </nav>
  );
}
