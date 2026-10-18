import React, { useEffect, useRef, useState } from "react";
import { motion, MotionConfig, useInView } from "framer-motion";
import {
  Search, Repeat, Bookmark, Banknote, LayoutDashboard, UserCircle,
  ServerCog, EyeOff, Lock, Sparkles, ArrowUp, Check,
} from "lucide-react";
import TiltedCard from "../../lib/TiltedCard.jsx";
import SpotlightCard from "../../lib/SpotlightCard.jsx";
import { useCountUp } from "../../hooks/useCountUp.js";

const EASE = [0.16, 1, 0.3, 1];

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-90px" },
  transition: { duration: 0.9, delay, ease: EASE },
});

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* ── Section heading ───────────────────────────────────── */
function Heading({ eyebrow, children, lede }) {
  return (
    <header className="lp-heading">
      <motion.div className="rr-eyebrow" {...reveal(0)}>
        <span className="rr-eyebrow-dot" /> {eyebrow}
      </motion.div>
      <motion.h2 {...reveal(0.06)}>{children}</motion.h2>
      {lede && <motion.p {...reveal(0.12)}>{lede}</motion.p>}
    </header>
  );
}

/* ── Stats strip ───────────────────────────────────────── */
function Stat({ value, prefix = "", label, note }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const n = useCountUp(inView ? value : 0, 1100);
  return (
    <div className="lp-stat" ref={ref}>
      <div className="lp-stat-value">
        {prefix}
        <span>{n}</span>
      </div>
      <div className="lp-stat-label">{label}</div>
      <div className="lp-stat-note">{note}</div>
    </div>
  );
}

function Stats() {
  return (
    <section className="lp-section lp-stats" aria-label="At a glance">
      <motion.div className="lp-stats-grid" {...reveal(0)}>
        <Stat value={24} label="API endpoints" note="REST, JWT-protected" />
        <Stat value={2} label="Roles" note="Librarian and member, enforced server-side" />
        <Stat value={5} prefix="₹" label="Fine per day late" note="Worked out when a book returns" />
        <Stat value={14} label="Day loan, one renewal" note="Blocked if someone is waiting" />
      </motion.div>
    </section>
  );
}

/* ── Feature micro-visuals (pure CSS, no images) ───────── */
const VisCatalog = () => (
  <div className="lp-vis lp-vis-catalog" aria-hidden="true">
    <div className="lp-vis-search"><Search size={13} /> clean code</div>
    <div className="lp-vis-chips"><i className="on">All</i><i>Science</i><i>History</i><i>Literature</i></div>
    <div className="lp-mini-shelf">
      {[["COM-002", "Clean Code", "#2B3E66"], ["SCI-001", "A Brief History of Time", "#1E4A47"], ["HIS-001", "Sapiens", "#7A5530"]].map(([c, t, col]) => (
        <div className="lp-mini-book" key={c} style={{ "--c": col }}><b>{c}</b><span>{t}</span></div>
      ))}
    </div>
  </div>
);
const VisCirc = () => (
  <div className="lp-vis lp-vis-rows" aria-hidden="true">
    <div><span>Sapiens</span><em className="ok">On loan</em></div>
    <div><span>Pride and Prejudice</span><em className="ok">Returned</em></div>
    <div><span>A Brief History of Time</span><em className="bad">Overdue</em></div>
  </div>
);
const VisQueue = () => (
  <div className="lp-vis lp-vis-queue" aria-hidden="true">
    {[1, 2, 3].map((n) => (
      <div key={n} style={{ "--i": n }}><b>{n}</b><span /></div>
    ))}
  </div>
);
const VisFine = () => (
  <div className="lp-vis lp-vis-fine" aria-hidden="true">
    <div className="row"><div><b>Vikram Nair</b><span>Pride and Prejudice · 6 days × ₹5</span></div><strong>₹30</strong><em className="bad">Unpaid</em></div>
    <div className="row"><div><b>Ananya Rao</b><span>Guns, Germs, and Steel · 6 days × ₹5</span></div><strong>₹30</strong><em className="ok">Paid</em></div>
  </div>
);
const VisDash = () => (
  <div className="lp-vis lp-vis-dash" aria-hidden="true">
    <svg viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="26" className="t" />
      <circle cx="32" cy="32" r="26" className="f" />
    </svg>
    <div className="lbl"><b>17</b><span>of 21 copies on shelf</span></div>
    <div className="bars"><i style={{ "--h": "78%" }} /><i style={{ "--h": "46%" }} /><i style={{ "--h": "62%" }} /><i style={{ "--h": "30%" }} /></div>
  </div>
);
const VisMember = () => (
  <div className="lp-vis lp-vis-member" aria-hidden="true">
    <div className="av">AR</div>
    <div><b>Ananya Rao</b><span>STU-2041 · student</span></div>
    <em>Your loans only</em>
  </div>
);

const FEATURES = [
  { key: "catalog", icon: Search, title: "A catalogue that finds things", body: "Search by title, author, category or call number. Call numbers like COM-002 and HIS-001 are generated for each category.", vis: VisCatalog, span: "lg" },
  { key: "circ", icon: Repeat, title: "One desk for every loan", body: "Issue, return and renew from a single screen. Overdue loans are flagged the day they pass their due date.", vis: VisCirc },
  { key: "queue", icon: Bookmark, title: "Fair reservation queues", body: "When every copy is out, members join a first-come queue. Renewals pause while someone is waiting.", vis: VisQueue },
  { key: "fine", icon: Banknote, title: "Fines that work themselves out", body: "₹5 for each day late, calculated on return. Mark them paid, and export the full loan history as CSV.", vis: VisFine, span: "lg" },
  { key: "dash", icon: LayoutDashboard, title: "A live picture of the shelves", body: "Copies on shelf, overdue count, on-time returns, most-borrowed titles and loans by category.", vis: VisDash, span: "lg" },
  { key: "member", icon: UserCircle, title: "Accounts for students and staff", body: "Members see only their own loans, reservations and fines, and can renew or cancel without asking the desk.", vis: VisMember },
];

function Features() {
  return (
    <section className="lp-section" id="features" aria-labelledby="lp-features">
      <Heading
        eyebrow="Features"
        lede="Everything a small library needs to lend, track and settle up — nothing it doesn't."
      >
        <span id="lp-features">Six tools, <em>one quiet room.</em></span>
      </Heading>
      <div className="lp-bento">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const Vis = f.vis;
          return (
            <motion.div key={f.key} className={`lp-bento-cell ${f.span === "lg" ? "is-wide" : ""}`} {...reveal(0.05 * (i % 3))}>
              <TiltedCard maxTilt={6} scale={1.015} glareColor="rgba(255,236,200,0.10)" className="lp-tilt">
                <SpotlightCard className="lp-card" spotlightColor="rgba(212,165,90,0.13)">
                  <div className="lp-card-top">
                    <span className="lp-icon"><Icon size={17} strokeWidth={1.5} /></span>
                    <span className="lp-card-no">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <Vis />
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </SpotlightCard>
              </TiltedCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Innovation ────────────────────────────────────────── */
const INNOVATIONS = [
  { icon: ServerCog, title: "The rules live on the server", body: "Copy availability, one renewal per loan, queue order and fine maths are enforced by the API, so editing browser state can't bend them." },
  { icon: EyeOff, title: "Private by design", body: "A member sees their own place in a queue and nothing else. Other members' names stay on the librarian's side of the desk." },
  { icon: Lock, title: "Real access control", body: "JWT sessions that expire after 12 hours, bcrypt-hashed passwords, and a role check plus an ownership check on every protected route." },
  { icon: Sparkles, title: "An interface that feels alive", body: "A live 3D library behind frosted glass, staged loading so nothing stutters, keyboard access and a calm fallback when motion is reduced." },
];

function Innovation() {
  return (
    <section className="lp-section lp-innov" id="innovation" aria-labelledby="lp-innov">
      <div className="lp-innov-grid">
        <div className="lp-innov-lead">
          <Heading eyebrow="What's different">
            <span id="lp-innov">Built like a system, <em>not a demo.</em></span>
          </Heading>
          <motion.p className="lp-lede" {...reveal(0.12)}>
            It started as a browser-only prototype. This version moves the rules, the data and the security
            into a real client/server design, then wraps it in an interface worth opening.
          </motion.p>
        </div>
        <ul className="lp-innov-list">
          {INNOVATIONS.map((x, i) => {
            const Icon = x.icon;
            return (
              <motion.li key={x.title} {...reveal(0.06 * i)}>
                <span className="lp-icon"><Icon size={17} strokeWidth={1.5} /></span>
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── 3D book, rotated by scroll progress via a CSS variable ── */
function Book3D({ label }) {
  return (
    <div className="lp-book-stage" aria-hidden="true">
      <div className="lp-book-float">
        <div className="lp-book">
          <div className="face front">
            <div className="frame" />
            <div className="ornament" />
            <div className="plate">Reading Room</div>
            <div className="rule" />
            <div className="rule short" />
          </div>
          <div className="face back" />
          <div className="face spine"><i /><i /><i /><i /></div>
          <div className="face pages" />
          <div className="face top" />
          <div className="face bottom" />
        </div>
      </div>
      <div className="lp-book-shadow" />
      <div className="lp-book-caption">{label}</div>
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Shelve a title", body: "Add a book and it gets a call number from its category. Every copy is counted, so the shelf total is always honest.", tag: "Catalogued" },
  { n: "02", title: "Issue it to a member", body: "Pick a book and a member. The loan starts at 14 days by default, and the available copy count drops straight away.", tag: "On loan" },
  { n: "03", title: "Reserve or renew", body: "If every copy is out, members queue up. A loan can be renewed once for 14 days, unless someone is waiting for it.", tag: "Reserved" },
  { n: "04", title: "Return and settle", body: "Late returns are charged ₹5 a day automatically. The librarian marks the fine paid, and the history exports to CSV.", tag: "Returned" },
];

function HowItWorks() {
  const section = useRef(null);
  const bookRef = useRef(null);
  const [active, setActive] = useState(0);

  // One passive listener drives a single CSS variable on one element.
  useEffect(() => {
    const el = section.current;
    const book = bookRef.current;
    if (!el || !book) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const steps = el.querySelector(".lp-steps");
      const r = (steps || el).getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.1)));
      book.style.setProperty("--p", p.toFixed(4));
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

  // Highlight the step nearest the middle of the screen.
  useEffect(() => {
    const items = section.current?.querySelectorAll("[data-step]");
    if (!items || !items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-section lp-how" id="how" ref={section} aria-labelledby="lp-how">
      <Heading eyebrow="How it works">
        <span id="lp-how">From shelf to settled, <em>in four steps.</em></span>
      </Heading>
      <div className="lp-how-grid" ref={bookRef}>
        <div className="lp-how-visual">
          <Book3D label={STEPS[active].tag} />
        </div>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.n} data-step={i} className={i === active ? "is-active" : ""}>
              <span className="lp-step-no">{s.n}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Tech + final call to action ───────────────────────── */
const STACK = ["React 18", "Vite", "Three.js", "Framer Motion", "Recharts", "Express", "JWT", "bcrypt"];

function Closing() {
  return (
    <section className="lp-section lp-closing" aria-label="Get started">
      <motion.div className="lp-stack" {...reveal(0)}>
        <span>Built with</span>
        <ul>
          {STACK.map((t) => (
            <li key={t}><Check size={12} strokeWidth={2} /> {t}</li>
          ))}
        </ul>
      </motion.div>

      <motion.div className="lp-cta-shell" {...reveal(0.08)}>
        <div className="lp-cta">
          <div className="rr-eyebrow"><span className="rr-eyebrow-dot" /> Try it</div>
          <h2>The desk is open. <em>Come on in.</em></h2>
          <p>Sign in as the librarian to run the desk, or as a student or staff member to browse and reserve. Demo accounts are on the sign-in card.</p>
          <button type="button" className="lp-btn lp-btn-primary" onClick={scrollToTop}>
            Go to sign in
            <span className="rr-island" aria-hidden="true"><ArrowUp size={15} strokeWidth={1.8} /></span>
          </button>
        </div>
      </motion.div>

      <footer className="lp-footer">
        <span>© 2026 NavinAdithya. All rights reserved.</span>
        <span>Reading Room — Library Management System</span>
      </footer>
    </section>
  );
}

export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <Stats />
        <Features />
        <Innovation />
        <HowItWorks />
        <Closing />
      </div>
    </MotionConfig>
  );
}

