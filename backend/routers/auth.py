from datetime import datetime, time
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.config import settings
from core.database import get_pool
from core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth")


def _user_dict(row) -> dict:
    d = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": row["created_at"].isoformat(),
    }
    if "login_count" in row.keys():
        d["login_count"] = row["login_count"]
    if "role" in row.keys():
        d["role"] = row["role"]
    if "organization_id" in row.keys():
        d["organization_id"] = row["organization_id"]
    return d


@router.post("/register")
async def register(request: Request):
    body = await request.json()
    name = body.get("name")
    email = body.get("email")
    password = body.get("password")
    role = body.get("role", "employee")  # "admin" or "employee"
    admin_secret = body.get("admin_secret", "")
    org_name = body.get("organization_name", "")

    if not name or not email or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "Name, email, and password are required"},
        )

    if role == "admin":
        if not admin_secret or admin_secret != settings.ADMIN_SECRET_KEY:
            return JSONResponse(
                status_code=403,
                content={"error": "Invalid admin secret key"},
            )
        if not org_name:
            return JSONResponse(
                status_code=400,
                content={"error": "Organization name is required for admin accounts"},
            )

    pool = get_pool()
    existing = await pool.fetchrow("SELECT id FROM users WHERE email = $1", email)
    if existing:
        return JSONResponse(
            status_code=409,
            content={"error": "An account with this email already exists"},
        )

    hashed = hash_password(password)

    org_id = None
    if role == "admin":
        org_row = await pool.fetchrow(
            "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
            org_name,
        )
        org_id = org_row["id"]

    row = await pool.fetchrow(
        "INSERT INTO users (name, email, password, role, organization_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, organization_id, created_at",
        name,
        email,
        hashed,
        role,
        org_id,
    )

    user = _user_dict(row)
    token = create_access_token(user["id"], user["email"])
    return JSONResponse(status_code=201, content={"user": user, "token": token})


@router.post("/login")
async def login(request: Request):
    body = await request.json()
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "Email and password are required"},
        )

    pool = get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not row:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid email or password"},
        )

    if not verify_password(password, row["password"]):
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid email or password"},
        )

    updated = await pool.fetchrow(
        "UPDATE users SET login_count = login_count + 1 WHERE id = $1 RETURNING id, name, email, role, organization_id, created_at, login_count",
        row["id"],
    )
    user = _user_dict(updated)
    token = create_access_token(user["id"], user["email"])

    # Fetch org config for period computation
    org_config = {"login_time": "09:00", "logoff_time": "18:00", "timezone": "Asia/Kolkata"}
    if row["organization_id"]:
        org = await pool.fetchrow(
            "SELECT login_time, logoff_time, timezone FROM organizations WHERE id = $1",
            row["organization_id"],
        )
        if org:
            org_config = {
                "login_time": org["login_time"].strftime("%H:%M") if org["login_time"] else "09:00",
                "logoff_time": org["logoff_time"].strftime("%H:%M") if org["logoff_time"] else "18:00",
                "timezone": org["timezone"] or "Asia/Kolkata",
            }

    # Compute period based on current time in org timezone
    tz = ZoneInfo(org_config["timezone"])
    now_local = datetime.now(tz)
    login_h, login_m = map(int, org_config["login_time"].split(":"))
    logoff_h, logoff_m = map(int, org_config["logoff_time"].split(":"))
    login_time_obj = time(login_h, login_m)
    logoff_time_obj = time(logoff_h, logoff_m)
    current_time = now_local.time()

    period = None
    if current_time < login_time_obj:
        period = "Morning"
    elif current_time > logoff_time_obj:
        period = "Evening"

    # Record attendance with optional GPS coordinates and period
    latitude = body.get("latitude")
    longitude = body.get("longitude")
    try:
        await pool.execute(
            "INSERT INTO attendance (user_id, latitude, longitude, period) VALUES ($1, $2, $3, $4)",
            row["id"],
            latitude,
            longitude,
            period,
        )
    except Exception:
        pass  # Don't fail login if attendance insert fails

    return JSONResponse(status_code=200, content={
        "user": user,
        "token": token,
        "org_config": org_config,
        "period": period,
    })


@router.get("/me")
async def me(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"error": "No token provided"},
        )

    token = auth_header.split(" ", 1)[1]
    try:
        decoded = decode_access_token(token)
    except Exception:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid or expired token"},
        )

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT id, name, email, role, organization_id, created_at FROM users WHERE id = $1",
        decoded["id"],
    )
    if not row:
        return JSONResponse(
            status_code=404,
            content={"error": "User not found"},
        )

    return JSONResponse(status_code=200, content={"user": _user_dict(row)})
