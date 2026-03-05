from datetime import datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/clients")


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


def _visit_dict(row) -> dict:
    return {
        "id": row["id"],
        "client_id": row["client_id"],
        "user_id": row["user_id"],
        "office_label": row["office_label"],
        "office_address": row["office_address"],
        "planned_at": row["planned_at"].isoformat(),
        "start_location": row["start_location"],
        "notes": row["notes"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@router.post("/{client_id}/visits")
async def create_visit(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    client = await pool.fetchrow("SELECT id FROM clients WHERE id = $1", client_id)
    if not client:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    body = await request.json()
    office_label = body.get("office_label")
    planned_at_str = body.get("planned_at")
    start_location = body.get("start_location")

    if not office_label or not planned_at_str or not start_location:
        return JSONResponse(
            status_code=400,
            content={"error": "office_label, planned_at, and start_location are required"},
        )

    try:
        planned_at = datetime.fromisoformat(planned_at_str)
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid planned_at format"})

    row = await pool.fetchrow(
        """INSERT INTO visits (client_id, user_id, office_label, office_address, planned_at, start_location, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *""",
        client_id,
        user_id,
        office_label,
        body.get("office_address"),
        planned_at,
        start_location,
        body.get("notes"),
    )

    return JSONResponse(status_code=201, content={"visit": _visit_dict(row)})


@router.get("/{client_id}/visits")
async def list_visits(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    client = await pool.fetchrow("SELECT id FROM clients WHERE id = $1", client_id)
    if not client:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    rows = await pool.fetch(
        "SELECT * FROM visits WHERE client_id = $1 ORDER BY planned_at DESC",
        client_id,
    )

    return JSONResponse(
        status_code=200,
        content={"visits": [_visit_dict(r) for r in rows]},
    )


@router.delete("/{client_id}/visits/{visit_id}")
async def delete_visit(client_id: int, visit_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "DELETE FROM visits WHERE id = $1 AND client_id = $2 AND user_id = $3 RETURNING id",
        visit_id, client_id, user_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Visit not found"})

    return JSONResponse(status_code=200, content={"deleted": True})
