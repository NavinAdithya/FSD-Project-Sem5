// Same-origin "/api" is valid in local dev via Vite proxy.
// On static hosts (e.g. GitHub Pages), VITE_API_BASE must be set to a live backend URL.
function normalizeApiPath(pathname) {
  const cleaned = (pathname || "").replace(/\/+$/, "");
  if (!cleaned) return "/api";
  if (cleaned.endsWith("/api/auth")) return "/api";
  if (cleaned.endsWith("/auth")) return cleaned.slice(0, -"/auth".length) || "/api";
  return cleaned;
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

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "/api";

  throw new Error(
    "API is not configured for this deployment. Set VITE_API_BASE to your backend URL (including /api)."
  );
}

const BASE = resolveBase();

function getToken() {
  return localStorage.getItem("lms_token");
}

async function request(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const token = getToken();
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch (_) {}
    if (res.status === 405) {
      message = `${message}. API endpoint: ${url}. Check VITE_API_BASE points to backend /api.`;
    }
    throw new Error(message);
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  setToken(token) {
    if (token) localStorage.setItem("lms_token", token);
    else localStorage.removeItem("lms_token");
  },
  hasToken() {
    return !!getToken();
  },

  librarianLogin: (username, password) => request("/auth/librarian-login", { method: "POST", body: { username, password } }),
  memberLogin: (memberId, password) => request("/auth/member-login", { method: "POST", body: { memberId, password } }),
  memberRegister: (data) => request("/auth/member-register", { method: "POST", body: data }),
  me: () => request("/auth/me"),

  getBooks: () => request("/books"),
  addBook: (data) => request("/books", { method: "POST", body: data }),
  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),

  getMembers: () => request("/members"),
  addMember: (data) => request("/members", { method: "POST", body: data }),
  deleteMember: (id) => request(`/members/${id}`, { method: "DELETE" }),

  getLoans: () => request("/loans"),
  getMyLoans: () => request("/loans/mine"),
  issueLoan: (bookId, memberId, days) => request("/loans/issue", { method: "POST", body: { bookId, memberId, days } }),
  returnLoan: (id) => request(`/loans/${id}/return`, { method: "POST" }),
  renewLoan: (id) => request(`/loans/${id}/renew`, { method: "POST" }),
  markFinePaid: (id) => request(`/loans/${id}/mark-paid`, { method: "POST" }),

  getReservations: () => request("/reservations"),
  getMyReservations: () => request("/reservations/mine"),
  getQueueSummary: () => request("/reservations/queue-summary"),
  reserveBook: (bookId) => request("/reservations", { method: "POST", body: { bookId } }),
  cancelReservation: (id) => request(`/reservations/${id}`, { method: "DELETE" }),

  getStats: () => request("/reports/stats"),
  getCategoryReport: () => request("/reports/categories"),
  async downloadCsv() {
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
