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

## Session 2 — Location Services & Live Map
**Date:** 2026-02-12
**Milestone:** 2 (Location & Map)

### Plan
- Add location permissions and services to the Expo app
- Integrate a map component (e.g., react-native-maps) to display a map view
- Request and obtain the user's live location
- Show the user's current position on the map in real time
- Handle permission denied / location unavailable states gracefully

### Result
- Installed navigation stack: `@react-navigation/native`, `@react-navigation/drawer`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`
- Installed `expo-location` for GPS, `react-native-maps` for native, `react-leaflet` + `leaflet` for web
- Created `babel.config.js` with `react-native-reanimated/plugin`
- Built full drawer navigation system:
  - `AppNavigator.tsx` — wraps `NavigationContainer` + `Drawer.Navigator` with `GestureHandlerRootView`
  - `CustomDrawerContent.tsx` — dark-themed drawer panel with avatar, user info, menu items (Home, Geo-Sense), and logout button
  - `types.ts` — `DrawerParamList` type definitions
- Modified `App.tsx` to render `AppNavigator` instead of `HomeScreen` post-login
- Modified `HomeScreen.tsx` — replaced logout button with hamburger menu icon; logout moved to drawer
- Created platform-split map components:
  - `MapView.tsx` (native) — `react-native-maps` with standard light map + green GPS marker with translucent radius circle
  - `MapView.web.tsx` (web) — `react-leaflet` with CartoDB Voyager light tiles + custom pulsating green GPS dot via CSS keyframe animation
- Created `GeoSenseScreen.tsx` — full-featured location screen:
  - Requests foreground location permission on mount
  - Subscribes to live GPS updates (`watchPositionAsync`, 5s/5m intervals)
  - Renders interactive map with pulsating green marker on user's position
  - Grayscale map + dark overlay with "Enable Location" prompt when permission denied
  - Live coordinates card with green "Live" indicator
- Updated `app.json` with iOS `NSLocationWhenInUseUsageDescription`, Android `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`, and `expo-location` plugin config
- Built Location Profiles feature (backend + frontend):
  - New `location_profiles` table: id, user_id, name, type (base/client), address, lat/lng, use_current_location, created_at
  - Backend router (`routers/locations.py`): create, list, delete endpoints with JWT auth; enforces single base location per user
  - Frontend API functions: `createLocationProfile`, `getLocationProfiles`, `deleteLocationProfile`
  - Profile creation modal on Geo-Sense screen: name, type selector (Base/Client), "Capture Current Location" toggle (captures live GPS coords), address text field (when toggle off)
  - Profile list below map: cards with name, type badge, address/coords, delete button; empty state placeholder
- Token now passed through `App.tsx` → `AppNavigator` → `GeoSenseScreen` for authenticated API calls

### Decisions
- Used `react-leaflet` with CartoDB Voyager tiles for web (no API key required, Google Maps-like appearance)
- Custom pulsating green GPS marker instead of default pin — solid green dot with white border + radiating pulse ring
- Map set to light mode for better visibility and modern feel
- Only one base location allowed per user (enforced server-side)
- "Capture Current Location" toggle snaps profile to exact GPS coordinates at time of creation
- Address field is a plain text input for now — Google Places autocomplete to be added later

---

## Session 3 — Client Engagements
**Date:** 2026-02-12
**Milestone:** 3 (Engagements)

### Plan
- Introduce an **Engagements** panel as a new drawer screen for managing client engagement records
- Design the data model: `clients` table (engagement metadata, tier, health) + `stakeholders` table (contacts linked to clients)
- Build backend CRUD endpoints for clients and stakeholders
- Build frontend: engagement list with FAB for registration, client detail screen with stakeholder management
- Add visit history placeholder on client detail for future implementation

### Result
- Created `clients` table: client_name, client_code (unique), industry_sector, company_size, HQ/office locations, website_domain, client_tier (Strategic/Normal/Low Touch), engagement_health (Good/Neutral/Risk), is_active, timestamps
- Created `stakeholders` table: contact_name, designation_role, email, phone, notes — FK to clients with CASCADE delete
- Built `routers/clients.py` with full CRUD:
  - Clients: create (409 on duplicate code), list, get, update (partial PATCH), delete
  - Stakeholders: create (requires existing client), list, delete — nested under `/api/clients/:id/stakeholders`
- Installed `@react-navigation/native-stack` for nested stack navigation inside drawer
- Built `EngagementsNavigator.tsx` — stack navigator wrapping list and detail screens
- Built `EngagementsScreen.tsx`:
  - Hamburger menu + "Engagements" header
  - Client cards showing name, code, engagement health dot (green/amber/red), industry tag, tier badge, active/inactive status
  - ">" arrow on each card navigates to detail screen with slide-from-right animation
  - Floating action button (FAB) in bottom-right opens registration form
  - Registration form: client name, code (auto-uppercase), industry, company size, HQ/office location, website, tier selector (Strategic/Normal/Low Touch)
  - Empty state with prompt to register first engagement
- Built `ClientDetailScreen.tsx`:
  - Back button + client name header
  - Info card: code, tier, health (colored), status, industry, size, HQ, office, website
  - Stakeholders section with "+ Add" button — modal form for contact name, role, email, phone, notes
  - Stakeholder cards with delete button
  - Visit History section with "Coming Soon" placeholder
- Updated drawer menu with "Engagements" entry
- Added all API functions to `api.ts`: createClient, getClients, getClient, deleteClient, createStakeholder, getStakeholders, deleteStakeholder

### Decisions
- Engagement health defaults to "Neutral" on creation — manual override to be added later
- Client code is unique globally (not per-user) to avoid confusion across the system
- Nested stack navigator inside drawer for the list → detail flow (slide-from-right transition)
- Stakeholders require a parent client — cannot exist independently
- Visit history is a placeholder for now, will be built out in a future session

---

## Session 4 — Audio Capture & Visit History
**Date:** TBD
**Milestone:** 4

### Plan
- Implement **audio recording** functionality on the Home screen — mic permissions, record/stop/playback controls, file storage
- Build out **visit history** on the client detail screen — check-in/check-out logging tied to location profiles
- Associate audio recordings with user accounts and optionally with client engagements

### Result
_To be updated at end of session._

### Decisions
_To be updated during session._
