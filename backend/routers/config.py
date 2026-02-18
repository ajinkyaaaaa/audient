from zoneinfo import ZoneInfo, available_timezones

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/config")

VALID_TIMEZONES = available_timezones()

DEFAULTS = {
    "login_time": "09:00",
    "logoff_time": "18:00",
    "timezone": "Asia/Kolkata",
}


def _get_user_from_token(request: Request) -> dict | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        return decode_access_token(token)
    except Exception:
        return None


@router.get("")
async def get_config(request: Request):
    """Any authenticated user: get org config (or defaults)."""
    decoded = _get_user_from_token(request)
    if not decoded:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    user = await pool.fetchrow(
        "SELECT organization_id FROM users WHERE id = $1", decoded["id"]
    )
    if not user or not user["organization_id"]:
        return JSONResponse(status_code=200, content={"config": DEFAULTS})

    org = await pool.fetchrow(
        "SELECT login_time, logoff_time, timezone FROM organizations WHERE id = $1",
        user["organization_id"],
    )
    if not org:
        return JSONResponse(status_code=200, content={"config": DEFAULTS})

    return JSONResponse(status_code=200, content={
        "config": {
            "login_time": org["login_time"].strftime("%H:%M") if org["login_time"] else DEFAULTS["login_time"],
            "logoff_time": org["logoff_time"].strftime("%H:%M") if org["logoff_time"] else DEFAULTS["logoff_time"],
            "timezone": org["timezone"] or DEFAULTS["timezone"],
        }
    })


@router.patch("")
async def update_config(request: Request):
    """Admin only: update org config."""
    decoded = _get_user_from_token(request)
    if not decoded:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    admin = await pool.fetchrow(
        "SELECT id, role, organization_id FROM users WHERE id = $1", decoded["id"]
    )
    if not admin or admin["role"] != "admin":
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    org_id = admin["organization_id"]
    if not org_id:
        return JSONResponse(status_code=400, content={"error": "No organization linked"})

    body = await request.json()
    login_time_str = body.get("login_time")
    logoff_time_str = body.get("logoff_time")
    timezone_str = body.get("timezone")

    # Validate timezone
    if timezone_str and timezone_str not in VALID_TIMEZONES:
        return JSONResponse(status_code=400, content={"error": f"Invalid timezone: {timezone_str}"})

    # Validate time format HH:MM
    import re
    time_pattern = re.compile(r"^\d{2}:\d{2}$")
    if login_time_str and not time_pattern.match(login_time_str):
        return JSONResponse(status_code=400, content={"error": "login_time must be HH:MM format"})
    if logoff_time_str and not time_pattern.match(logoff_time_str):
        return JSONResponse(status_code=400, content={"error": "logoff_time must be HH:MM format"})

    # Validate login_time < logoff_time if both provided
    if login_time_str and logoff_time_str:
        if login_time_str >= logoff_time_str:
            return JSONResponse(status_code=400, content={"error": "login_time must be before logoff_time"})

    # Build update
    updates = []
    params = []
    idx = 1
    if login_time_str:
        updates.append(f"login_time = ${idx}::time")
        params.append(login_time_str)
        idx += 1
    if logoff_time_str:
        updates.append(f"logoff_time = ${idx}::time")
        params.append(logoff_time_str)
        idx += 1
    if timezone_str:
        updates.append(f"timezone = ${idx}")
        params.append(timezone_str)
        idx += 1

    if not updates:
        return JSONResponse(status_code=400, content={"error": "No fields to update"})

    params.append(org_id)
    query = f"UPDATE organizations SET {', '.join(updates)} WHERE id = ${idx}"
    await pool.execute(query, *params)

    # Fetch updated config
    org = await pool.fetchrow(
        "SELECT login_time, logoff_time, timezone FROM organizations WHERE id = $1", org_id
    )

    return JSONResponse(status_code=200, content={
        "config": {
            "login_time": org["login_time"].strftime("%H:%M") if org["login_time"] else DEFAULTS["login_time"],
            "logoff_time": org["logoff_time"].strftime("%H:%M") if org["logoff_time"] else DEFAULTS["logoff_time"],
            "timezone": org["timezone"] or DEFAULTS["timezone"],
        }
    })
