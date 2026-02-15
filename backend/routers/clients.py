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


def _client_dict(row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "client_name": row["client_name"],
        "client_code": row["client_code"],
        "industry_sector": row["industry_sector"],
        "company_size": row["company_size"],
        "headquarters_location": row["headquarters_location"],
        "primary_office_location": row["primary_office_location"],
        "website_domain": row["website_domain"],
        "client_tier": row["client_tier"],
        "engagement_health": row["engagement_health"],
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


def _stakeholder_dict(row) -> dict:
    return {
        "id": row["id"],
        "client_id": row["client_id"],
        "contact_name": row["contact_name"],
        "designation_role": row["designation_role"],
        "email": row["email"],
        "phone": row["phone"],
        "notes": row["notes"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


# ── Clients ──────────────────────────────────────────────

@router.post("")
async def create_client(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    body = await request.json()
    client_name = body.get("client_name")
    client_code = body.get("client_code")

    if not client_name or not client_code:
        return JSONResponse(
            status_code=400,
            content={"error": "Client name and client code are required"},
        )

    pool = get_pool()

    existing = await pool.fetchrow(
        "SELECT id FROM clients WHERE client_code = $1", client_code
    )
    if existing:
        return JSONResponse(
            status_code=409,
            content={"error": f"Client code '{client_code}' already exists"},
        )

    row = await pool.fetchrow(
        """INSERT INTO clients (
            user_id, client_name, client_code, industry_sector, company_size,
            headquarters_location, primary_office_location, website_domain, client_tier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *""",
        user_id,
        client_name,
        client_code,
        body.get("industry_sector"),
        body.get("company_size"),
        body.get("headquarters_location"),
        body.get("primary_office_location"),
        body.get("website_domain"),
        body.get("client_tier", "Normal"),
    )

    return JSONResponse(status_code=201, content={"client": _client_dict(row)})


@router.get("")
async def list_clients(request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    rows = await pool.fetch(
        "SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC",
        user_id,
    )

    return JSONResponse(
        status_code=200,
        content={"clients": [_client_dict(r) for r in rows]},
    )


@router.get("/{client_id}")
async def get_client(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
        client_id, user_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    return JSONResponse(status_code=200, content={"client": _client_dict(row)})


@router.patch("/{client_id}")
async def update_client(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    body = await request.json()
    pool = get_pool()

    existing = await pool.fetchrow(
        "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
        client_id, user_id,
    )
    if not existing:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    updatable = [
        "client_name", "industry_sector", "company_size",
        "headquarters_location", "primary_office_location",
        "website_domain", "client_tier", "engagement_health", "is_active",
    ]
    sets = []
    vals = []
    idx = 1
    for field in updatable:
        if field in body:
            sets.append(f"{field} = ${idx}")
            vals.append(body[field])
            idx += 1

    if not sets:
        return JSONResponse(status_code=400, content={"error": "No fields to update"})

    sets.append(f"updated_at = NOW()")
    vals.append(client_id)
    vals.append(user_id)

    query = f"UPDATE clients SET {', '.join(sets)} WHERE id = ${idx} AND user_id = ${idx + 1} RETURNING *"
    row = await pool.fetchrow(query, *vals)

    return JSONResponse(status_code=200, content={"client": _client_dict(row)})


@router.delete("/{client_id}")
async def delete_client(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    row = await pool.fetchrow(
        "DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING id",
        client_id, user_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    return JSONResponse(status_code=200, content={"deleted": True})


# ── Stakeholders ─────────────────────────────────────────

@router.post("/{client_id}/stakeholders")
async def create_stakeholder(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    client = await pool.fetchrow(
        "SELECT id FROM clients WHERE id = $1 AND user_id = $2",
        client_id, user_id,
    )
    if not client:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    body = await request.json()
    contact_name = body.get("contact_name")
    if not contact_name:
        return JSONResponse(status_code=400, content={"error": "Contact name is required"})

    row = await pool.fetchrow(
        """INSERT INTO stakeholders (client_id, contact_name, designation_role, email, phone, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *""",
        client_id,
        contact_name,
        body.get("designation_role"),
        body.get("email"),
        body.get("phone"),
        body.get("notes"),
    )

    return JSONResponse(status_code=201, content={"stakeholder": _stakeholder_dict(row)})


@router.get("/{client_id}/stakeholders")
async def list_stakeholders(client_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    client = await pool.fetchrow(
        "SELECT id FROM clients WHERE id = $1 AND user_id = $2",
        client_id, user_id,
    )
    if not client:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    rows = await pool.fetch(
        "SELECT * FROM stakeholders WHERE client_id = $1 ORDER BY created_at ASC",
        client_id,
    )

    return JSONResponse(
        status_code=200,
        content={"stakeholders": [_stakeholder_dict(r) for r in rows]},
    )


@router.delete("/{client_id}/stakeholders/{stakeholder_id}")
async def delete_stakeholder(client_id: int, stakeholder_id: int, request: Request):
    user_id = _get_user_id(request)
    if user_id is None:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    pool = get_pool()
    client = await pool.fetchrow(
        "SELECT id FROM clients WHERE id = $1 AND user_id = $2",
        client_id, user_id,
    )
    if not client:
        return JSONResponse(status_code=404, content={"error": "Client not found"})

    row = await pool.fetchrow(
        "DELETE FROM stakeholders WHERE id = $1 AND client_id = $2 RETURNING id",
        stakeholder_id, client_id,
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Stakeholder not found"})

    return JSONResponse(status_code=200, content={"deleted": True})
