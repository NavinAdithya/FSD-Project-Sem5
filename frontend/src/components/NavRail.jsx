import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookMarked, Users, Repeat,
  Bookmark, Banknote, UserCircle, ShieldCheck,
  LogOut, BookOpen
} from "lucide-react";

export default function NavRail({ role, librarianName, member, stats, tab, onTabChange, onSignOut }) {
  const librarianTabs = [
    { key: "dashboard",    label: "Dashboard",    icon: LayoutDashboard },
    { key: "catalog",      label: "Catalog",       icon: BookMarked },
    { key: "members",      label: "Members",       icon: Users },
    { key: "circulation",  label: "Circulation",   icon: Repeat },
    { key: "reservations", label: "Reservations",  icon: Bookmark },
    { key: "fines",        label: "Fines",         icon: Banknote },
  ];
  const memberTabs = [
    { key: "catalog",  label: "Catalog",     icon: BookMarked },
    { key: "account",  label: "My Account",  icon: UserCircle },
  ];
  const tabs = role === "librarian" ? librarianTabs : memberTabs;

  return (
    <aside className="rr-rail" aria-label="Navigation">
      {/* Brand */}
      <div className="rr-brand">
        <div className="rr-brand-icon" aria-hidden="true">
          <BookOpen size={20} strokeWidth={1.5} />
        </div>
        <div>
          <div className="rr-brand-title">Reading Room</div>
          <div className="rr-brand-sub">Library Register</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="rr-nav" aria-label="Main navigation">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              className={`rr-nav-item ${active ? "is-active" : ""}`}
              onClick={() => onTabChange(t.key)}
              aria-current={active ? "page" : undefined}
            >
              {/* Active background pill with layoutId for shared-layout animation */}
              {active && (
                <motion.div
                  className="rr-nav-active-pill"
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <span className="rr-nav-active-bar" />
                </motion.div>
              )}
              <Icon size={17} strokeWidth={1.5} className="rr-nav-icon" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="rr-rail-foot">
        <div className="rr-rail-who">
          {role === "librarian"
            ? <><ShieldCheck size={13} /> {librarianName || "Librarian desk"}</>
            : <><UserCircle size={13} /> {member ? member.name : "Member"}</>
          }
        </div>
        <div className="rr-rail-stat">
          <div className="rr-rail-meter" aria-hidden="true">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: stats.totalCopies ? stats.availableCopies / stats.totalCopies : 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </div>
          <span>{stats.availableCopies}</span> of {stats.totalCopies} copies on shelf
        </div>
        <button className="rr-nav-item rr-signout" onClick={onSignOut} aria-label="Sign out">
          <LogOut size={15} strokeWidth={1.5} className="rr-nav-icon" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
