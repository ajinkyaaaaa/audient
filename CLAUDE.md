# Audient

## Architecture

```
audient/
├── frontend/          React Native (Expo) app — port 8081
├── backend/           Python FastAPI server — port 3001
├── designs/           Figma exports (PNG) for UI reference
├── CLAUDE.md          Project context (this file)
├── ROADMAP.md         Milestones and feature tracking
└── SESSION.md         Per-session planning and progress
```

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | Expo SDK 54, React 19, React Native, TypeScript |
| Backend  | FastAPI, asyncpg, bcrypt, PyJWT, pydantic-settings |
| Database | PostgreSQL (`audient` db, user: `ajinkyakarnik`, host: localhost) |
| Fonts    | Inter (via @expo-google-fonts/inter)             |
| Styling  | React Native StyleSheet (no CSS framework)       |

## Running the App

```bash
# Backend
cd backend && source venv/bin/activate && python main.py

# Frontend
cd frontend && npx expo start --web
```

## Key Files

### Backend
- `backend/main.py` — FastAPI app, CORS, lifespan, router mounts
- `backend/core/config.py` — pydantic-settings `Settings` class (reads `.env`)
- `backend/core/database.py` — asyncpg pool, `init_db()` creates/migrates `users` table
- `backend/core/security.py` — bcrypt hashing, PyJWT token create/decode (HS256, 7-day expiry)
- `backend/routers/auth.py` — register, login, me endpoints
- `backend/routers/health.py` — health check endpoint
- `backend/.env` — DB credentials, JWT_SECRET, PORT

### Frontend
- `frontend/App.tsx` — Root component, manages auth state (user + token)
- `frontend/src/screens/AuthScreen.tsx` — Login/Register with video background
- `frontend/src/screens/HomeScreen.tsx` — Landing page after login
- `frontend/src/services/api.ts` — API client (`register`, `login`, `getMe`)
- `frontend/app.json` — Expo config
- `frontend/package.json` — Dependencies

## API Endpoints

| Method | Path                 | Errors         | Success | Notes                            |
| ------ | -------------------- | -------------- | ------- | -------------------------------- |
| POST   | `/api/auth/register` | 400, 409       | 201     | Returns `{user, token}`          |
| POST   | `/api/auth/login`    | 400, 401       | 200     | Returns `{user, token}`, increments `login_count` |
| GET    | `/api/auth/me`       | 401, 404       | 200     | Returns `{user}`, requires Bearer token |
| GET    | `/api/health`        | —              | 200     | Returns `{status: "ok"}`         |

## Database Schema

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,        -- bcrypt hash
    created_at TIMESTAMP DEFAULT NOW(),
    login_count INTEGER DEFAULT 0
);
```

## Conventions

- Backend uses raw SQL via asyncpg (no ORM)
- Backend reads `.env` via pydantic-settings
- Frontend uses inline `StyleSheet.create()` — no Tailwind/CSS
- Passwords hashed with bcrypt directly (not passlib — incompatible with bcrypt 5.x)
- JWT tokens: HS256, 7-day expiry, payload contains `{id, email, exp, iat}`
- Auth flow: register redirects to login page (no auto-login after register)
- HomeScreen shows "Welcome" on first login, "Welcome back" on subsequent logins

## Design Reference

Place Figma exports as PNG images in `designs/` folder:
- One screen per image, 2x resolution
- Add descriptions in `designs/README.md`
- I can read images directly and replicate layouts from them
