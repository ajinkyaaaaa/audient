from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/recordings")


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


def _recording_dict(row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "transcript": row["transcript"],
        "duration_seconds": row["duration_seconds"],
        "created_at": row["created_at"].isoformat(),
    }


@router.post("")
async def create_recording(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    body = await request.json()
    transcript = body.get("transcript")
    duration_seconds = body.get("duration_seconds")

    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO recordings (user_id, transcript, duration_seconds)
           VALUES ($1, $2, $3) RETURNING *""",
        user_id, transcript, duration_seconds,
    )

    return JSONResponse(status_code=201, content={"recording": _recording_dict(row)})


@router.get("")
async def list_recordings(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    rows = await pool.fetch(
        "SELECT * FROM recordings WHERE user_id = $1 ORDER BY created_at DESC",
        user_id,
    )

    return JSONResponse(
        status_code=200,
        content={"recordings": [_recording_dict(r) for r in rows]},
    )


@router.get("/{recording_id}")
async def get_recording(recording_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM recordings WHERE id = $1 AND user_id = $2",
        recording_id, user_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Recording not found"})

    return JSONResponse(status_code=200, content={"recording": _recording_dict(row)})


@router.delete("/{recording_id}")
async def delete_recording(recording_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "DELETE FROM recordings WHERE id = $1 AND user_id = $2 RETURNING id",
        recording_id, user_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Recording not found"})

    return JSONResponse(status_code=200, content={"deleted": True})
