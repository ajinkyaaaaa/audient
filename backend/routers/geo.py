from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/geo")


def _get_user_id(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
        return payload["id"]
    except Exception:
        return None


@router.get("/nearby")
async def get_nearby(request: Request, lat: float, lng: float):
    """Return the highest-priority named geo-point within its radius."""
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    user = await pool.fetchrow(
        "SELECT organization_id FROM users WHERE id = $1", user_id
    )
    org_id = user["organization_id"] if user else None

    # Fetch org's configured base geofence radius (falls back to 150m)
    base_radius = 150
    if org_id:
        org = await pool.fetchrow(
            "SELECT base_geofence_radius FROM organizations WHERE id = $1", org_id
        )
        if org and org["base_geofence_radius"]:
            base_radius = org["base_geofence_radius"]

    rows = await pool.fetch(
        """
        SELECT label, source_type,
            CASE WHEN source_type = 'org_base' THEN $5 ELSE radius_meters END AS effective_radius,
            6371000 * ACOS(LEAST(1.0,
                SIN(RADIANS($1)) * SIN(RADIANS(latitude)) +
                COS(RADIANS($1)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude - $2))
            )) AS distance_m
        FROM geo_locations
        WHERE (org_id = $3 OR org_id IS NULL)
          AND (user_id = $4 OR user_id IS NULL)
        ORDER BY priority ASC, distance_m ASC
        """,
        lat, lng, org_id, user_id, base_radius,
    )

    for row in rows:
        if row["distance_m"] <= row["effective_radius"]:
            return JSONResponse(status_code=200, content={
                "label": row["label"],
                "source": row["source_type"],
                "distance_m": int(row["distance_m"]),
            })

    return JSONResponse(status_code=200, content={
        "label": None,
        "source": "other",
        "distance_m": None,
    })
