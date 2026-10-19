# Reading Room — Library Management System (full-stack)

A real client/server rebuild of the Library Management System: an Express + JWT
API backed by a JSON file store, and a Vite + React frontend with the same
glassmorphism UI, wired to real endpoints instead of browser-only storage.

```
lms-fullstack/
├── backend/     Express API, JWT auth, JSON file "database"
└── frontend/    Vite + React app (glass UI)
```

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env      # optional — defaults work out of the box
npm run dev                # or: npm start
```

Starts the API on **http://localhost:4000**. On first run it creates
`backend/data/db.json`, seeded with enough live data that the app looks
fully in-use immediately — nothing to demo is empty:

- **9 books** across 6 categories (so the "loans by category" chart has real bars)
- **4 active loans**, one of them genuinely **overdue** (dates are relative
  to "today", so this is always accurate whenever you run it)
- A **live reservation queue**: *Sapiens* is fully checked out with 2 members
  queued — good for demoing "Reserve" and the renewal-blocked-by-reservation rule
- **1 paid fine** and **1 unpaid fine** on record, to show both Fines-panel states
- One loan already **renewed once**, to show the disabled "already renewed" state live

**Seed credentials**
| Role | Login | Password | Has going on |
|---|---|---|---|
| Librarian | `librarian` | `librarian123` | full desk access |
| Student — Ananya Rao | Member ID `STU-2041` | `stu-2041` | 1 active loan (renewable), 1 paid-fine history, #1 in the *Sapiens* queue |
| Student — Vikram Nair | Member ID `STU-2042` | `stu-2042` | 1 **overdue** loan, 1 **unpaid fine**, #2 in the *Sapiens* queue |
| Staff — Dr. Priya Menon | Member ID `STF-0091` | `stf-0091` | holds the last copy of *Sapiens* (why the queue exists), 1 loan already renewed |

(A seed member's default password is just their member ID in lowercase.
New members who self-register set their own password. Delete
`backend/data/db.json` at any time to reset back to this exact demo state.)

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Opens on **http://localhost:5173** and proxies `/api/*` requests to the
backend at `localhost:4000` (see `frontend/vite.config.js`). Sign in as the
librarian or a member on the login screen.

> For static deployments (like GitHub Pages), set `VITE_API_BASE` to your
> hosted backend base URL including `/api` (example:
> `https://your-backend.example.com/api`). Without it, login requests cannot be
> routed to the backend.

## 3. Build for production

```bash
cd frontend && npm run build   # outputs static files to frontend/dist
cd ../backend && npm start     # serve the API; point any static host at frontend/dist
```

## What's different from the browser-only version

- Real authentication: JWT-based login for librarians and members (bcrypt
  password hashing), instead of a client-side role picker.
- A real backend enforces the rules — copy availability, one-renewal-per-loan,
  reservation queues, fine calculation — so they can't be bypassed by editing
  browser state.
- Data lives in `backend/data/db.json` (a lightweight JSON file store) instead
  of the Claude-artifact `window.storage` API, so it works as a normal app
  anywhere Node runs.
- Members only ever see their own loans/reservations over the API; the full
  reservation queue (with other members' names) is librarian-only.

## API reference (auth & role requirements)

All routes except login/register require `Authorization: Bearer <JWT>`.
"Owner" means a member can only act on their own record; a librarian can act on any.

| Method & path | Who | What it does |
|---|---|---|
| `POST /api/auth/librarian-login` | public | Librarian sign-in |
| `POST /api/auth/member-login` | public | Member sign-in |
| `POST /api/auth/member-register` | public | Self-register as a new member |
| `GET /api/auth/me` | any | Resolve the current session |
| `GET /api/books` | any | List the catalog |
| `POST /api/books` | librarian | Add a title |
| `DELETE /api/books/:id` | librarian | Remove a title (blocked if on loan) |
| `GET /api/members` | librarian | List members |
| `POST /api/members` | librarian | Register a member |
| `DELETE /api/members/:id` | librarian | Remove a member (blocked if on loan) |
| `GET /api/loans` | librarian | All loans |
| `GET /api/loans/mine` | member | The caller's own loans |
| `POST /api/loans/issue` | librarian | Issue a book |
| `POST /api/loans/:id/return` | librarian | Return a book (fine auto-calculated) |
| `POST /api/loans/:id/renew` | owner | Renew once, blocked if reserved by someone else |
| `POST /api/loans/:id/mark-paid` | librarian | Mark a fine as paid |
| `GET /api/reservations` | librarian | All reservations, with member identities |
| `GET /api/reservations/mine` | member | The caller's own reservations |
| `GET /api/reservations/queue-summary` | any | Queue length per book + caller's position (no other members' identities exposed) |
| `POST /api/reservations` | member | Reserve a book |
| `DELETE /api/reservations/:id` | owner | Cancel a reservation |
| `GET /api/reports/stats` | librarian | Dashboard numbers |
| `GET /api/reports/categories` | librarian | Loans-by-category chart data |
| `GET /api/reports/csv` | librarian | Download full loan history as CSV |

RBAC is enforced by two Express middlewares in `backend/middleware/auth.js`:
`requireAuth` (valid JWT required) and `requireRole('librarian')` (role check).
Ownership checks (a member acting only on their own loan/reservation) are done
inline in each route handler by comparing `req.user.memberId` to the record.

## Next steps if you deploy this for real

- Swap the JSON file store in `backend/db.js` for a real database (Postgres/
  SQLite) — the storage functions are isolated there, so route code shouldn't
  need to change much.
- Set a strong, unique `JWT_SECRET` in `backend/.env`.
- Put the frontend build behind a real static host or have Express serve
  `frontend/dist` directly.
