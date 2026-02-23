from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/location")


def _get_user_from_token(request: Request) -> dict | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        return decode_access_token(token)
    except Exception:
        return None


@router.post("/sync")
async def sync_location(request: Request):
    """Any authenticated user: push current GPS coordinates to server."""
    decoded = _get_user_from_token(request)
    if not decoded:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    body = await request.json()
    lat = body.get("latitude")
    lng = body.get("longitude")

    if lat is None or lng is None:
        return JSONResponse(status_code=400, content={"error": "latitude and longitude required"})

    pool = get_pool()
    await pool.execute(
        """
        UPDATE users
        SET loc_lat = $1, loc_lng = $2, loc_synced_at = NOW()
        WHERE id = $3
        """,
        lat, lng, decoded["id"],
    )

    return JSONResponse(status_code=200, content={"synced": True})
