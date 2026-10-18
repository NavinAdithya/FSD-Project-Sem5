import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, GraduationCap, AlertTriangle, BookOpen, ArrowUpRight } from "lucide-react";
import BlurText from "../lib/BlurText.jsx";

// Spring config
const spring = { type: "spring", stiffness: 340, damping: 28 };

export default function LoginGate({ onLibrarianLogin, onMemberLogin, onMemberRegister }) {
  const [mode, setMode] = useState("choose"); // choose | librarian | member | register
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const [lib, setLib] = useState({ username: "librarian", password: "" });
  const [mem, setMem] = useState({ memberId: "", password: "" });
  const [reg, setReg] = useState({ name: "", memberId: "", role: "student", contact: "", password: "" });

  const wrap = (fn) => async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
      setShake(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShake(true));
      });
      setTimeout(() => setShake(false), 600);
    } finally {
      setBusy(false);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -30 : 30, scale: 0.97 }),
  };

  const [dir, setDir] = useState(1);
  const go = (m, d = 1) => { setDir(d); setMode(m); setError(""); };

  const rise = (delay) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div className="rr-gate">
      {/* Editorial copy — sits directly on the live 3D room */}
      <section className="rr-gate-hero" aria-labelledby="gate-heading">
        <motion.div className="rr-eyebrow" {...rise(0.1)}>
          <span className="rr-eyebrow-dot" /> Library register · open late
        </motion.div>
        <h1 id="gate-heading" className="rr-gate-headline">
          <BlurText text="Every book," stagger={0.08} delay={0.25} />
          <br />
          <em><BlurText text="accounted for." stagger={0.08} delay={0.5} /></em>
        </h1>
        <motion.p className="rr-gate-copy" {...rise(0.8)}>
          Catalogue, circulation, reservations and fines — kept in one quiet room.
          Sign in at the desk or with your member card.
        </motion.p>
        <motion.ul className="rr-gate-facts" {...rise(1)}>
          <li><span>01</span>Issue and return in two clicks</li>
          <li><span>02</span>Fines worked out the day a book comes back</li>
          <li><span>03</span>Fair queues for titles that are out</li>
        </motion.ul>
      </section>

      {/* Double-bezel glass card */}
      <motion.div
        className="rr-gate-shell"
        initial={{ opacity: 0, y: 40, rotateX: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.35 }}
      >
      <div
        className={`rr-gate-card ${shake ? "rr-shake" : ""}`}
        role="region"
        aria-label="Sign in to Reading Room"
      >
        {/* Brand */}
        <div className="rr-gate-brand">
          <div className="rr-gate-brand-icon" aria-hidden="true">
            <BookOpen size={22} strokeWidth={1.4} />
          </div>
          <div>
            <div className="rr-gate-title">Reading Room</div>
            <div className="rr-gate-sub">Library Register</div>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              className="rr-gate-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
            >
              <AlertTriangle size={13} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode panels */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={mode}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >
            {/* CHOOSE */}
            {mode === "choose" && (
              <div>
                <p className="rr-gate-lede">Who's signing in?</p>
                <button className="rr-gate-option" onClick={() => go("librarian", 1)}>
                  <span className="rr-gate-option-icon"><ShieldCheck size={18} strokeWidth={1.5} /></span>
                  <div className="rr-gate-option-text">
                    <div className="rr-gate-option-title">Librarian</div>
                    <div className="rr-gate-option-sub">Full desk access — catalog, members, circulation, fines</div>
                  </div>
                  <span className="rr-island" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={1.6} /></span>
                </button>
                <button className="rr-gate-option" onClick={() => go("member", 1)}>
                  <span className="rr-gate-option-icon"><GraduationCap size={18} strokeWidth={1.5} /></span>
                  <div className="rr-gate-option-text">
                    <div className="rr-gate-option-title">Student or staff</div>
                    <div className="rr-gate-option-sub">Browse the catalog, reserve titles, see your own loans</div>
                  </div>
                  <span className="rr-island" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={1.6} /></span>
                </button>
              </div>
            )}

            {/* LIBRARIAN */}
            {mode === "librarian" && (
              <form className="rr-form" onSubmit={wrap(() => onLibrarianLogin(lib.username, lib.password))}>
                <label>Username<input value={lib.username} onChange={(e) => setLib({ ...lib, username: e.target.value })} autoFocus /></label>
                <label>Password<input type="password" value={lib.password} onChange={(e) => setLib({ ...lib, password: e.target.value })} /></label>
                <div className="rr-form-actions">
                  <button type="button" className="rr-btn" onClick={() => go("choose", -1)}>Back</button>
                  <button type="submit" className="rr-btn rr-btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
                </div>
                <div className="rr-form-hint">Demo: librarian / librarian123</div>
              </form>
            )}

            {/* MEMBER */}
            {mode === "member" && (
              <form className="rr-form" onSubmit={wrap(() => onMemberLogin(mem.memberId, mem.password))}>
                <label>Member ID<input value={mem.memberId} onChange={(e) => setMem({ ...mem, memberId: e.target.value })} placeholder="e.g. STU-2041" autoFocus /></label>
                <label>Password<input type="password" value={mem.password} onChange={(e) => setMem({ ...mem, password: e.target.value })} /></label>
                <div className="rr-form-actions">
                  <button type="button" className="rr-btn" onClick={() => go("choose", -1)}>Back</button>
                  <button type="submit" className="rr-btn rr-btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
                </div>
                <div className="rr-gate-links">
                  <button type="button" className="rr-link" onClick={() => go("register", 1)}>New here? Register</button>
                </div>
                <div className="rr-form-hint">Demo: stu-2041 / stu-2041</div>
              </form>
            )}

            {/* REGISTER */}
            {mode === "register" && (
              <form className="rr-form" onSubmit={wrap(() => onMemberRegister(reg))}>
                <label>Full name<input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} autoFocus /></label>
                <div className="rr-form-row">
                  <label>Member ID<input value={reg.memberId} onChange={(e) => setReg({ ...reg, memberId: e.target.value })} placeholder="e.g. STU-2050" /></label>
                  <label>Role
                    <select value={reg.role} onChange={(e) => setReg({ ...reg, role: e.target.value })}>
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                </div>
                <label>Contact<input value={reg.contact} onChange={(e) => setReg({ ...reg, contact: e.target.value })} placeholder="email or phone" /></label>
                <label>Password<input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} /></label>
                <div className="rr-form-actions">
                  <button type="button" className="rr-btn" onClick={() => go("member", -1)}>Back</button>
                  <button type="submit" className="rr-btn rr-btn-primary" disabled={busy}>{busy ? "Registering…" : "Register & continue"}</button>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      </motion.div>
    </div>
  );
}
