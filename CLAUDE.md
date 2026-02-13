# Audient

## What Is Audient?
A field operations app for professionals who work across multiple client locations. Core capabilities:
- **Authentication** — email/password registration and login
- **Geo-Sense** — live GPS tracking with an interactive map, location profiles (one "Base" HQ + multiple "Client" sites), and coordinate capture
- **Engagements** _(planned)_ — manage client interactions and scheduled activities tied to location profiles
- **Audio Capture** _(planned)_ — record voice notes / ambient audio from the Home screen

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
- `backend/core/database.py` — asyncpg pool, `init_db()` creates/migrates tables (users, location_profiles)
- `backend/core/security.py` — bcrypt hashing, PyJWT token create/decode (HS256, 7-day expiry)
- `backend/routers/auth.py` — register, login, me endpoints
- `backend/routers/locations.py` — location profile CRUD (create, list, delete)
- `backend/routers/health.py` — health check endpoint
- `backend/.env` — DB credentials, JWT_SECRET, PORT

### Frontend
- `frontend/App.tsx` — Root component, manages auth state (user + token)
- `frontend/src/navigation/AppNavigator.tsx` — Drawer navigator, registers Home + Geo-Sense screens
- `frontend/src/navigation/CustomDrawerContent.tsx` — Dark-themed drawer with avatar, menu, logout
- `frontend/src/navigation/types.ts` — `DrawerParamList` type
- `frontend/src/screens/AuthScreen.tsx` — Login/Register with video background
- `frontend/src/screens/HomeScreen.tsx` — Landing page with hamburger menu
- `frontend/src/screens/GeoSenseScreen.tsx` — Live map, GPS tracking, location profile management
- `frontend/src/components/MapView.tsx` — Native map (react-native-maps, light mode, green GPS dot)
- `frontend/src/components/MapView.web.tsx` — Web map (react-leaflet, CartoDB Voyager, pulsating GPS dot)
- `frontend/src/services/api.ts` — API client (auth + location profile functions)
- `frontend/babel.config.js` — Babel config with react-native-reanimated plugin

## API Endpoints

| Method | Path                      | Errors         | Success | Notes                            |
| ------ | ------------------------- | -------------- | ------- | -------------------------------- |
| POST   | `/api/auth/register`      | 400, 409       | 201     | Returns `{user, token}`          |
| POST   | `/api/auth/login`         | 400, 401       | 200     | Returns `{user, token}`, increments `login_count` |
| GET    | `/api/auth/me`            | 401, 404       | 200     | Returns `{user}`, requires Bearer token |
| POST   | `/api/locations`          | 400, 401, 409  | 201     | Create location profile; 409 if base already exists |
| GET    | `/api/locations`          | 401            | 200     | List user's location profiles    |
| DELETE | `/api/locations/:id`      | 401, 404       | 200     | Delete a location profile        |
| GET    | `/api/health`             | —              | 200     | Returns `{status: "ok"}`         |

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

CREATE TABLE location_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('base', 'client')),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    use_current_location BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
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
- Navigation: `@react-navigation/drawer` with custom dark-themed drawer content
- Maps: platform-split — `.tsx` for native (react-native-maps), `.web.tsx` for web (react-leaflet + CartoDB Voyager tiles)
- Dark gradient theme across all screens: `#0f0c29` → `#302b63` → `#24243e`
- Location profiles: one base per user (enforced server-side), unlimited client locations

## Design Reference

Place Figma exports as PNG images in `designs/` folder:
- One screen per image, 2x resolution
- Add descriptions in `designs/README.md`
- I can read images directly and replicate layouts from them
