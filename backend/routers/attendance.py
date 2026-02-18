from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/attendance")


@router.get("/today")
async def get_today_attendance(request: Request):
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
        "SELECT id, user_id, login_at, latitude, longitude, created_at FROM attendance "
        "WHERE user_id = $1 AND login_at::date = CURRENT_DATE ORDER BY login_at DESC LIMIT 1",
        decoded["id"],
    )

    if not row:
        return JSONResponse(status_code=200, content={"attendance": None})

    return JSONResponse(
        status_code=200,
        content={
            "attendance": {
                "id": row["id"],
                "user_id": row["user_id"],
                "login_at": row["login_at"].isoformat(),
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "created_at": row["created_at"].isoformat(),
            }
        },
    )
