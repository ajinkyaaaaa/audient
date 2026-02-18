from datetime import date, datetime

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from core.database import get_pool
from core.security import decode_access_token

router = APIRouter(prefix="/api/sentry")


def _get_user_from_token(request: Request) -> dict | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        return decode_access_token(token)
    except Exception:
        return None


async def _verify_admin(request: Request):
    """Return (decoded_token, admin_row, org_id) or a JSONResponse error."""
    decoded = _get_user_from_token(request)
    if not decoded:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"}), None, None

    pool = get_pool()
    admin = await pool.fetchrow(
        "SELECT id, role, organization_id FROM users WHERE id = $1", decoded["id"]
    )
    if not admin or admin["role"] != "admin":
        return JSONResponse(status_code=403, content={"error": "Admin access required"}), None, None

    org_id = admin["organization_id"]
    if not org_id:
        return JSONResponse(status_code=400, content={"error": "No organization linked"}), None, None

    return None, admin, org_id


@router.get("/employees")
async def get_employees(request: Request):
    """Admin-only: list employees in the same organization with their latest attendance."""
    err, admin, org_id = await _verify_admin(request)
    if err:
        return err

    pool = get_pool()

    employees = await pool.fetch(
        """
        SELECT u.id, u.name, u.email, u.role, u.login_count, u.created_at,
               a.login_at AS last_login_at, a.latitude AS last_latitude, a.longitude AS last_longitude
        FROM users u
        LEFT JOIN LATERAL (
            SELECT login_at, latitude, longitude
            FROM attendance
            WHERE user_id = u.id
            ORDER BY login_at DESC
            LIMIT 1
        ) a ON true
        WHERE u.organization_id = $1
        ORDER BY a.login_at DESC NULLS LAST
        """,
        org_id,
    )

    result = []
    for emp in employees:
        result.append({
            "id": emp["id"],
            "name": emp["name"],
            "email": emp["email"],
            "role": emp["role"],
            "login_count": emp["login_count"] or 0,
            "created_at": emp["created_at"].isoformat() if emp["created_at"] else None,
            "last_login_at": emp["last_login_at"].isoformat() if emp["last_login_at"] else None,
            "last_latitude": emp["last_latitude"],
            "last_longitude": emp["last_longitude"],
        })

    return JSONResponse(status_code=200, content={"employees": result})


@router.get("/attendance/by-date")
async def get_attendance_by_date(
    request: Request,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
):
    """Admin-only: get all attendance records for the org on a specific date."""
    err, admin, org_id = await _verify_admin(request)
    if err:
        return err

    pool = get_pool()

    rows = await pool.fetch(
        """
        SELECT a.id, a.user_id, u.name, u.email, u.role,
               a.login_at, a.latitude, a.longitude
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE u.organization_id = $1
          AND a.login_at::date = $2::date
        ORDER BY a.login_at DESC
        """,
        org_id,
        date,
    )

    records = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "name": r["name"],
            "email": r["email"],
            "role": r["role"],
            "login_at": r["login_at"].isoformat() if r["login_at"] else None,
            "latitude": r["latitude"],
            "longitude": r["longitude"],
        }
        for r in rows
    ]

    return JSONResponse(status_code=200, content={"records": records, "date": date})


@router.get("/attendance/month-summary")
async def get_month_summary(
    request: Request,
    year: int = Query(...),
    month: int = Query(...),
):
    """Admin-only: get count of logins per day for a given month (for calendar dots)."""
    err, admin, org_id = await _verify_admin(request)
    if err:
        return err

    pool = get_pool()

    rows = await pool.fetch(
        """
        SELECT a.login_at::date AS day, COUNT(*) AS count
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE u.organization_id = $1
          AND EXTRACT(YEAR FROM a.login_at) = $2
          AND EXTRACT(MONTH FROM a.login_at) = $3
        GROUP BY a.login_at::date
        ORDER BY day
        """,
        org_id,
        year,
        month,
    )

    days = {r["day"].isoformat(): r["count"] for r in rows}

    return JSONResponse(status_code=200, content={"days": days, "year": year, "month": month})


@router.get("/employees/{employee_id}/attendance")
async def get_employee_attendance(employee_id: int, request: Request):
    """Admin-only: get full attendance history for an employee."""
    err, admin, org_id = await _verify_admin(request)
    if err:
        return err

    pool = get_pool()

    emp = await pool.fetchrow(
        "SELECT id FROM users WHERE id = $1 AND organization_id = $2",
        employee_id, org_id,
    )
    if not emp:
        return JSONResponse(status_code=404, content={"error": "Employee not found"})

    rows = await pool.fetch(
        "SELECT id, login_at, latitude, longitude FROM attendance WHERE user_id = $1 ORDER BY login_at DESC LIMIT 50",
        employee_id,
    )

    attendance = [
        {
            "id": r["id"],
            "login_at": r["login_at"].isoformat() if r["login_at"] else None,
            "latitude": r["latitude"],
            "longitude": r["longitude"],
        }
        for r in rows
    ]

    return JSONResponse(status_code=200, content={"attendance": attendance})
