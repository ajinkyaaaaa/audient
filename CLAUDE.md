# Audient

## What Is Audient?
A field operations app for professionals who work across multiple client locations. Core capabilities:
- **Authentication** — email/password registration and login
- **Geo-Sense** — live GPS tracking with an interactive map, location profiles (one "Base" HQ + multiple "Client" sites), and coordinate capture
- **Engagements** — client engagement registry with stakeholder management, tier classification, and health tracking; detail view with visit history placeholder
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
- `backend/core/database.py` — asyncpg pool, `init_db()` creates/migrates tables (users, location_profiles, clients, stakeholders)
- `backend/core/security.py` — bcrypt hashing, PyJWT token create/decode (HS256, 7-day expiry)
- `backend/routers/auth.py` — register, login, me endpoints
- `backend/routers/locations.py` — location profile CRUD (create, list, delete)
- `backend/routers/clients.py` — client CRUD + nested stakeholder CRUD (create, list, get, update, delete)
- `backend/routers/health.py` — health check endpoint
- `backend/.env` — DB credentials, JWT_SECRET, PORT

### Frontend
- `frontend/App.tsx` — Root component, manages auth state (user + token)
- `frontend/src/navigation/AppNavigator.tsx` — Drawer navigator, registers Home, Geo-Sense, Engagements screens
- `frontend/src/navigation/CustomDrawerContent.tsx` — Dark-themed drawer with avatar, menu, logout
- `frontend/src/navigation/EngagementsNavigator.tsx` — Nested stack navigator (list → client detail)
- `frontend/src/navigation/types.ts` — `DrawerParamList` + `EngagementsStackParamList` types
- `frontend/src/screens/AuthScreen.tsx` — Login/Register with video background
- `frontend/src/screens/HomeScreen.tsx` — Landing page with hamburger menu
- `frontend/src/screens/GeoSenseScreen.tsx` — Live map, GPS tracking, location profile management
- `frontend/src/screens/EngagementsScreen.tsx` — Client engagement list, FAB for registration, create form modal
- `frontend/src/screens/ClientDetailScreen.tsx` — Client detail view, stakeholder management, visit history placeholder
- `frontend/src/components/MapView.tsx` — Native map (react-native-maps, light mode, green GPS dot)
- `frontend/src/components/MapView.web.tsx` — Web map (react-leaflet, CartoDB Voyager, pulsating GPS dot)
- `frontend/src/services/api.ts` — API client (auth, location profiles, clients, stakeholders)
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
| POST   | `/api/clients`            | 400, 401, 409  | 201     | Register client engagement       |
| GET    | `/api/clients`            | 401            | 200     | List user's client engagements   |
| GET    | `/api/clients/:id`        | 401, 404       | 200     | Get single client detail         |
| PATCH  | `/api/clients/:id`        | 400, 401, 404  | 200     | Update client fields             |
| DELETE | `/api/clients/:id`        | 401, 404       | 200     | Delete client engagement         |
| POST   | `/api/clients/:id/stakeholders`     | 400, 401, 404 | 201 | Add stakeholder to client   |
| GET    | `/api/clients/:id/stakeholders`     | 401, 404       | 200 | List client's stakeholders  |
| DELETE | `/api/clients/:id/stakeholders/:sid`| 401, 404       | 200 | Remove stakeholder          |
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
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_code VARCHAR(100) UNIQUE NOT NULL,
    industry_sector VARCHAR(255),
    company_size VARCHAR(100),
    headquarters_location TEXT,
    primary_office_location TEXT,
    website_domain VARCHAR(255),
    client_tier VARCHAR(50) DEFAULT 'Normal' CHECK (client_tier IN ('Strategic', 'Normal', 'Low Touch')),
    engagement_health VARCHAR(20) DEFAULT 'Neutral' CHECK (engagement_health IN ('Good', 'Neutral', 'Risk')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stakeholders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    designation_role VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
- Navigation: `@react-navigation/drawer` with custom dark-green-themed drawer content
- Maps: platform-split — `.tsx` for native (react-native-maps), `.web.tsx` for web (react-leaflet + CartoDB Voyager tiles)
- Light green theme: `#f5f5f0` page bg, `#ffffff` cards with `#e5e7eb` borders, `#3d7b5f`→`#4a9d7a` green accents, `#2d4a3e`→`#1f3830` dark green drawer
- Location profiles: one base per user (enforced server-side), unlimited client locations
- Engagements: nested stack navigator inside drawer for list → detail transitions (`@react-navigation/native-stack`)
- Client engagement_health defaults to "Neutral" on creation
- Stakeholders are scoped to a client (must create client first)

## Design Reference

Place Figma exports as PNG images in `designs/` folder:
- One screen per image, 2x resolution
- Add descriptions in `designs/README.md`
- I can read images directly and replicate layouts from them
