/**
 * READING ROOM — API Client
 *
 * Local dev: same-origin "/api" proxied by Vite to localhost:4000.
 * Hosted / Static dev:
 *  - If VITE_API_BASE is set, routes all calls to the remote backend.
 *  - If deployed statically (e.g. GitHub Pages) without a remote backend,
 *    gracefully falls back to mockApi so the demo remains functional without 405s.
 */
import { mockApi } from "./mockStore.js";

function normalizeApiPath(pathname) {
  const cleaned = (pathname || "").replace(/\/+$/, "");
  if (!cleaned) return "/api";
  if (cleaned.endsWith("/api/auth")) return "/api";
  if (cleaned.endsWith("/auth")) return cleaned.slice(0, -"/auth".length) || "/api";
  if (!cleaned.endsWith("/api")) return `${cleaned}/api`;
  return cleaned;
}

function isLocalHost(host) {
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host)
  );
}

export function isStaticDemoMode() {
  const configured = (import.meta.env.VITE_API_BASE || "").trim();
  if (configured) return false;
  if (typeof window === "undefined") return false;
  return !isLocalHost(window.location.hostname);
}

function resolveBase() {
  const configured = (import.meta.env.VITE_API_BASE || "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      url.pathname = normalizeApiPath(url.pathname);
      return url.toString().replace(/\/+$/, "");
    } catch (_) {
      return normalizeApiPath(configured);
    }
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (isLocalHost(host)) return "/api";

  // Static host without configured API base
  return "";
}

const BASE = resolveBase();

function getToken() {
  return localStorage.getItem("lms_token");
}

async function request(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  // If static demo mode, route directly to mockApi
  if (isStaticDemoMode()) {
    throw new Error("Demo mode active — should use mockApi handler");
  }

  const base = BASE || "/api";
  const url = `${base}${path}`;
  const token = getToken();

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      `Cannot connect to backend API (${url}). Please ensure the backend server is running.`
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch (_) {}

    if (res.status === 405) {
      message = `HTTP 405 (Method Not Allowed): Static hosts cannot process API requests directly. Configure VITE_API_BASE to point to your live backend server with /api.`;
    } else if (res.status === 401 && token) {
      api.setToken(null);
    }
    throw new Error(message);
  }

  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

function dispatch(apiMethodName, ...args) {
  if (isStaticDemoMode()) {
    if (typeof mockApi[apiMethodName] === "function") {
      return mockApi[apiMethodName](...args);
    }
  }
  return null;
}

export const api = {
  setToken(token) {
    if (token) localStorage.setItem("lms_token", token);
    else localStorage.removeItem("lms_token");
  },
  hasToken() {
    return !!getToken();
  },

  librarianLogin: (username, password) =>
    dispatch("librarianLogin", username, password) ??
    request("/auth/librarian-login", { method: "POST", body: { username, password } }),

  memberLogin: (memberId, password) =>
    dispatch("memberLogin", memberId, password) ??
    request("/auth/member-login", { method: "POST", body: { memberId, password } }),

  memberRegister: (data) =>
    dispatch("memberRegister", data) ??
    request("/auth/member-register", { method: "POST", body: data }),

  me: () =>
    dispatch("me") ??
    request("/auth/me"),

  getBooks: () =>
    dispatch("getBooks") ??
    request("/books"),

  addBook: (data) =>
    dispatch("addBook", data) ??
    request("/books", { method: "POST", body: data }),

  deleteBook: (id) =>
    dispatch("deleteBook", id) ??
    request(`/books/${id}`, { method: "DELETE" }),

  getMembers: () =>
    dispatch("getMembers") ??
    request("/members"),

  addMember: (data) =>
    dispatch("addMember", data) ??
    request("/members", { method: "POST", body: data }),

  deleteMember: (id) =>
    dispatch("deleteMember", id) ??
    request(`/members/${id}`, { method: "DELETE" }),

  getLoans: () =>
    dispatch("getLoans") ??
    request("/loans"),

  getMyLoans: () =>
    dispatch("getMyLoans") ??
    request("/loans/mine"),

  issueLoan: (bookId, memberId, days) =>
    dispatch("issueLoan", bookId, memberId, days) ??
    request("/loans/issue", { method: "POST", body: { bookId, memberId, days } }),

  returnLoan: (id) =>
    dispatch("returnLoan", id) ??
    request(`/loans/${id}/return`, { method: "POST" }),

  renewLoan: (id) =>
    dispatch("renewLoan", id) ??
    request(`/loans/${id}/renew`, { method: "POST" }),

  markFinePaid: (id) =>
    dispatch("markFinePaid", id) ??
    request(`/loans/${id}/mark-paid`, { method: "POST" }),

  getReservations: () =>
    dispatch("getReservations") ??
    request("/reservations"),

  getMyReservations: () =>
    dispatch("getMyReservations") ??
    request("/reservations/mine"),

  getQueueSummary: () =>
    dispatch("getQueueSummary") ??
    request("/reservations/queue-summary"),

  reserveBook: (bookId) =>
    dispatch("reserveBook", bookId) ??
    request("/reservations", { method: "POST", body: { bookId } }),

  cancelReservation: (id) =>
    dispatch("cancelReservation", id) ??
    request(`/reservations/${id}`, { method: "DELETE" }),

  getStats: () =>
    dispatch("getStats") ??
    request("/reports/stats"),

  getCategoryReport: () =>
    dispatch("getCategoryReport") ??
    request("/reports/categories"),

  async downloadCsv() {
    if (isStaticDemoMode()) {
      const db = await mockApi.getBooks();
      const loans = await mockApi.getLoans();
      const members = await mockApi.getMembers();
      const header = ["Call Number", "Book Title", "Member ID", "Member Name", "Role", "Issue Date", "Due Date", "Return Date", "Status", "Fine", "Fine Paid"];
      const rows = loans.map((l) => {
        const b = db.find((bk) => bk.id === l.bookId);
        const m = members.find((mm) => mm.id === l.memberId);
        return [
          b ? b.callNumber : "",
          b ? b.title : "",
          m ? m.memberId : "",
          m ? m.name : "",
          m ? m.role : "",
          l.issueDate,
          l.dueDate,
          l.returnDate || "",
          l.returnDate ? "Returned" : "On loan",
          l.fineAmount || 0,
          l.finePaid ? "Paid" : "Unpaid",
        ];
      });
      const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "loan-history.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    const res = await request("/reports/csv", { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loan-history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export class ApiError extends Error {}
