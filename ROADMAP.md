# Audient Roadmap

## Milestone 1: Project Setup & Auth System
**Status:** Complete

- [x] Project structure — `frontend/` + `backend/` separation
- [x] Python FastAPI backend replacing Node.js/Express
- [x] PostgreSQL integration with asyncpg
- [x] User registration endpoint (POST /api/auth/register)
- [x] User login endpoint (POST /api/auth/login)
- [x] Token-protected me endpoint (GET /api/auth/me)
- [x] Health check endpoint (GET /api/health)
- [x] Auth UI — login & register screens with video background
- [x] Register-to-login redirect (no auto-login after registration)
- [x] "Welcome" vs "Welcome back" based on login_count
- [x] bcrypt password hashing (compatible with existing hashes)
- [x] JWT tokens with 7-day expiry
- [x] CORS configured for development
- [x] `.gitignore` covering frontend + Python backend

## Milestone 2: TBD
**Status:** Not started

- [ ] ...

## Milestone 3: TBD
**Status:** Not started

- [ ] ...
