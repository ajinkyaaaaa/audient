from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/locations")


def _get_user_id(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        decoded = decode_access_token(token)
        return decoded["id"]
    except Exception:
        return None


def _profile_dict(row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "type": row["type"],
        "address": row["address"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "use_current_location": row["use_current_location"],
        "created_at": row["created_at"].isoformat(),
    }


@router.post("")
async def create_profile(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    body = await request.json()
    name = body.get("name")
    profile_type = body.get("type")
    address = body.get("address")
    latitude = body.get("latitude")
    longitude = body.get("longitude")
    use_current_location = body.get("use_current_location", False)

    if not name or not profile_type:
        return JSONResponse(
            status_code=400,
            content={"error": "Name and type are required"},
        )

    if profile_type not in ("base", "client"):
        return JSONResponse(
            status_code=400,
            content={"error": "Type must be 'base' or 'client'"},
        )

    if not use_current_location and not address:
        return JSONResponse(
            status_code=400,
            content={"error": "Address is required when not using current location"},
        )

    # Only one base location per user
    if profile_type == "base":
        pool = get_pool()
        existing = await pool.fetchrow(
            "SELECT id FROM location_profiles WHERE user_id = $1 AND type = 'base'",
            user_id,
        )
        if existing:
            return JSONResponse(
                status_code=409,
                content={"error": "A base location already exists. Delete it first to create a new one."},
            )

    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO location_profiles (user_id, name, type, address, latitude, longitude, use_current_location)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *""",
        user_id, name, profile_type, address, latitude, longitude, use_current_location,
    )

    return JSONResponse(status_code=201, content={"profile": _profile_dict(row)})


@router.get("")
async def list_profiles(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    rows = await pool.fetch(
        "SELECT * FROM location_profiles WHERE user_id = $1 ORDER BY created_at DESC",
        user_id,
    )

    return JSONResponse(
        status_code=200,
        content={"profiles": [_profile_dict(r) for r in rows]},
    )


@router.delete("/{profile_id}")
async def delete_profile(profile_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "DELETE FROM location_profiles WHERE id = $1 AND user_id = $2 RETURNING id",
        profile_id, user_id,
    )

    if not row:
        return JSONResponse(status_code=404, content={"error": "Profile not found"})

    return JSONResponse(status_code=200, content={"deleted": True})
