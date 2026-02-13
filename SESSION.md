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

## Session 3 — Engagements & Audio Capture
**Date:** TBD
**Milestone:** 3

### Plan
- Introduce an **Engagements** panel as a new drawer screen, providing a centralized view for managing client interactions and scheduled activities
- Implement **audio recording** functionality on the Home screen, enabling users to capture voice notes or ambient audio directly within the app
- Design the Engagements data model and backend endpoints (CRUD operations, linking to location profiles where relevant)
- Build the Engagements UI: list view, creation form, status tracking
- Integrate device microphone permissions and recording controls (start, stop, playback) on the Home screen
- Handle audio file storage and associate recordings with user accounts

### Result
_To be updated at end of session._

### Decisions
_To be updated during session._
