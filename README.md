# Reading Room — Library Management System

A full-stack library system: **Express + JWT** backend with JSON file store, and a **Vite + React** frontend with a glassmorphism / 3D UI.

```
lms-fullstack/
├── backend/   Express API, JWT auth, bcrypt, rate limiting
└── frontend/  Vite + React (Three.js, Framer Motion)
```

## Quick Start

**Backend** (terminal 1):
```bash
cd backend && npm install && npm start
# API runs on http://localhost:4000
```

**Frontend** (terminal 2):
```bash
cd frontend && npm install && npm run dev
# App runs on http://localhost:5173
```

> On first run, `backend/data/db.json` is auto-created with seeded demo data (books, loans, fines, reservations).

## Demo Credentials

| Role | Login | Password |
|---|---|---|
| Librarian | `librarian` | `librarian123` |
| Student (Ananya Rao) | `STU-2041` | `stu-2041` |
| Student (Vikram Nair) | `STU-2042` | `stu-2042` |
| Staff (Dr. Priya Menon) | `STF-0091` | `stf-0091` |

> Delete `backend/data/db.json` at any time to reset demo data.

## Features

- JWT authentication with role-based access (librarian / member)
- Issue, return, renew loans — one renewal per loan, blocked by reservations
- Reservation queue with fair ordering
- Automatic fine calculation on overdue returns
- Librarian dashboard with stats and CSV export
- Static demo mode on GitHub Pages (no backend needed — runs in-browser)

## Static Deployment (GitHub Pages)

The frontend auto-detects static hosting and falls back to an in-browser mock store so everything works without a backend.

To connect a real backend, set the repo variable:
```
VITE_API_BASE=https://your-backend.example.com/api
```

## API Routes

All routes except login/register require `Authorization: Bearer <JWT>`.

| Method & Path | Auth | Description |
|---|---|---|
| `POST /api/auth/librarian-login` | public | Librarian sign-in |
| `POST /api/auth/member-login` | public | Member sign-in |
| `POST /api/auth/member-register` | public | Self-register |
| `GET /api/auth/me` | any | Current session |
| `GET /api/books` | any | Catalog |
| `POST /api/books` | librarian | Add book |
| `DELETE /api/books/:id` | librarian | Remove book |
| `GET /api/members` | librarian | Member list |
| `POST /api/loans/issue` | librarian | Issue book |
| `POST /api/loans/:id/return` | librarian | Return book |
| `POST /api/loans/:id/renew` | owner | Renew loan |
| `POST /api/loans/:id/mark-paid` | librarian | Mark fine paid |
| `GET /api/reservations` | librarian | All reservations |
| `POST /api/reservations` | member | Reserve book |
| `GET /api/reports/stats` | librarian | Dashboard stats |
| `GET /api/reports/csv` | librarian | Export CSV |

## Security

- Passwords hashed with **bcrypt**
- **Rate limiting**: 20 auth attempts / 300 API requests per 15 min window
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS
- JWT expiry enforced; tokens invalidated on 401
- Payload size capped at 50 KB
- RBAC enforced server-side; ownership checks on member routes
