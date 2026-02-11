# Session Log

---

## Session 1 — Project Restructure & Auth System
**Date:** 2026-02-11
**Milestone:** 1 (Project Setup & Auth System)

### Plan
- Move all frontend files (App.tsx, src/, assets/, etc.) into `frontend/`
- Delete old Node.js backend (`server/`)
- Create Python FastAPI backend in `backend/` with full API parity
- Set up asyncpg connection pool, bcrypt hashing, JWT tokens
- Create venv and install all Python dependencies
- Update `.gitignore` for both frontend and Python backend
- Verify health endpoint and full auth flow

### Result
- All frontend files moved successfully, no path changes needed
- Old `server/` directory removed
- Python backend created with FastAPI, asyncpg, bcrypt, PyJWT
- Hit `passlib` + `bcrypt 5.x` incompatibility — fixed by using `bcrypt` directly
- DB credentials needed adjustment (`ajinkyakarnik` user, not `postgres`)
- Health, register, and login endpoints verified via curl
- UI tested: register + login flow working end-to-end
- Added `login_count` column to users table
- Register now redirects to login page with success message (no auto-login)
- HomeScreen shows "Welcome" on first login, "Welcome back" on subsequent
- Created CLAUDE.md, ROADMAP.md, SESSION.md for future session efficiency

### Decisions
- Used `bcrypt` library directly instead of `passlib` (passlib broken with bcrypt 5.x)
- Raw SQL via asyncpg — no ORM
- `login_count` tracked server-side in DB, incremented on each login

---

## Session 2 — TBD
**Date:** YYYY-MM-DD
**Milestone:** X

### Plan
- ...

### Result
_To be updated at end of session._

### Decisions
_To be updated during session._
