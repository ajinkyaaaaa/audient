from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

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
    return d


@router.post("/register")
async def register(request: Request):
    body = await request.json()
    name = body.get("name")
    email = body.get("email")
    password = body.get("password")

    if not name or not email or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "Name, email, and password are required"},
        )

    pool = get_pool()
    existing = await pool.fetchrow("SELECT id FROM users WHERE email = $1", email)
    if existing:
        return JSONResponse(
            status_code=409,
            content={"error": "An account with this email already exists"},
        )

    hashed = hash_password(password)
    row = await pool.fetchrow(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        name,
        email,
        hashed,
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
        "UPDATE users SET login_count = login_count + 1 WHERE id = $1 RETURNING id, name, email, created_at, login_count",
        row["id"],
    )
    user = _user_dict(updated)
    token = create_access_token(user["id"], user["email"])
    return JSONResponse(status_code=200, content={"user": user, "token": token})


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
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        decoded["id"],
    )
    if not row:
        return JSONResponse(
            status_code=404,
            content={"error": "User not found"},
        )

    return JSONResponse(status_code=200, content={"user": _user_dict(row)})
