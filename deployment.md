# Deployment Guide

Your app has two parts that both need to go public: the **backend** (FastAPI + Postgres) and the **frontend** (Expo app).

---

## Backend

1. **Host Postgres** — create a free database on [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy the connection string.

2. **Deploy the API** — push to [Railway](https://railway.app) or [Render](https://render.com). Point `DATABASE_URL` and `JWT_SECRET` to your new hosted values via environment variables. Set `PORT=3001`.

3. **Note the public URL** — e.g. `https://audient-api.railway.app`. You'll need it next.

---

## Frontend — Web

4. In `frontend/src/services/api.ts`, set the production `API_URL` to your hosted backend URL (for non-`__DEV__` builds).

5. Run `npx expo export -p web` — this produces a `dist/` folder.

6. Deploy `dist/` to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (drag-and-drop or `vercel deploy`).

---

## Frontend — iOS & Android (optional)

7. Install EAS CLI: `npm install -g eas-cli`, then `eas login`.

8. Run `eas build --platform all` to produce store-ready `.ipa` and `.aab` files.

9. **iOS** → upload to [App Store Connect](https://appstoreconnect.apple.com) (requires $99/yr Apple Developer account).

10. **Android** → upload to [Google Play Console](https://play.google.com/console) (requires $25 one-time fee).

---

**Recommended starting point:** Deploy backend to Railway + web frontend to Vercel. That gets you a shareable URL in under an hour, no app store review needed.

---

## Railway Deployment — Full Walkthrough & Troubleshooting

This section documents the exact steps taken, errors hit, and how they were fixed.

### Step 1 — Prepare the codebase

Before touching Railway, these things need to be done locally:

- Generate `requirements.txt` from your venv:
  ```bash
  cd backend && source venv/bin/activate
  pip freeze > requirements.txt
  ```
- Make sure `main.py` binds to `0.0.0.0` (not localhost), otherwise Railway can't reach it:
  ```python
  uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
  ```
- Push everything to GitHub.

---

### Step 2 — Create the Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select your repo.
2. In service **Settings**, set **Root Directory** to `backend`.
3. Click **+ New** → **Database** → **Add PostgreSQL** — Railway creates a Postgres instance and injects `DATABASE_URL` automatically.
4. Go to your service → **Variables** → add:
   ```
   JWT_SECRET=your_secret_here
   PORT=3001
   ```

---

### Error 1 — "Error creating a build with Railpack"

**What happened:** Railway's default builder (Railpack) failed to build the Python app.

**Fix attempted:** Added a `Procfile` in `backend/` and set the Start Command to `python main.py` in Railway dashboard. This only fixes the runtime start command, not the build — so the error persisted.

**Root fix:** Switched the builder from Railpack to **Nixpacks** in Railway dashboard:
- Service → **Settings** → **Build** → change **Builder** to `Nixpacks`

---

### Error 2 — "script start.sh not found"

**What happened:** Even after switching to Nixpacks, it couldn't figure out how to build or start a Python app because there was no explicit build config.

**Fix:** Created `backend/nixpacks.toml` to explicitly tell Nixpacks the Python version, how to install dependencies, and how to start the app:

```toml
[phases.setup]
nixPkgs = ["python39"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "python main.py"
```

Also created `backend/Procfile` as a fallback:
```
web: python main.py
```

---

### Problem 3 — DATABASE_URL vs individual DB vars

**What happened:** Railway's Postgres plugin injects a single `DATABASE_URL` env var. But the app's `database.py` was connecting using individual vars (`DB_HOST`, `DB_PORT`, `DB_USER`, etc.) — so the DB connection would fail even if the build succeeded.

**Fix — `core/config.py`:** Added `DATABASE_URL` as an optional field:
```python
DATABASE_URL: Optional[str] = None  # Provided by Railway Postgres
```

**Fix — `core/database.py`:** Updated the connection logic to use `DATABASE_URL` when present, fall back to individual vars otherwise:
```python
if settings.DATABASE_URL:
    pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL)
else:
    pool = await asyncpg.create_pool(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
    )
```

This keeps local development working exactly as before, while Railway works automatically via the injected `DATABASE_URL`.

---

### Files added/modified for Railway

| File | Action | Purpose |
|---|---|---|
| `backend/nixpacks.toml` | Created | Tells Nixpacks the Python version, install command, and start command |
| `backend/Procfile` | Created | Fallback start command |
| `backend/core/config.py` | Modified | Added `DATABASE_URL` optional field |
| `backend/core/database.py` | Modified | Uses `DATABASE_URL` when available |
