import React from "react";

export function MemberForm({ onSubmit, onCancel }) {
  const [form, setForm] = React.useState({ name: "", memberId: "", role: "student", contact: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim() && form.memberId.trim();
  return (
    <form className="rr-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(form); }}>
      <label>Full name<input value={form.name} onChange={set("name")} placeholder="e.g. Ritika Sharma" autoFocus /></label>
      <div className="rr-form-row">
        <label>Member ID<input value={form.memberId} onChange={set("memberId")} placeholder="e.g. STU-2050" /></label>
        <label>Role
          <select value={form.role} onChange={set("role")}>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </label>
      </div>
      <label>Contact<input value={form.contact} onChange={set("contact")} placeholder="email or phone" /></label>
      <div className="rr-form-actions">
        <button type="button" className="rr-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="rr-btn rr-btn-primary" disabled={!valid}>Register</button>
      </div>
      <div className="rr-form-hint">Default password for this member will be their member ID (lowercase).</div>
    </form>
  );
}
