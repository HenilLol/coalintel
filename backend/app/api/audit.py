from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.rbac import get_current_user, require_roles
from app.schemas.audit import AuditLogResponse

router = APIRouter(tags=["System Audit Ledger"])

# Issue #69: bounded page size — the audit ledger grows unboundedly by design,
# so the API must never allow unbounded result sets.
MAX_PAGE_LIMIT = 200


@router.get("/audit/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=MAX_PAGE_LIMIT, description="Page size (max 200)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    action: Optional[str] = Query(None, description="Filter by exact action (e.g. LOGIN_FAILED)"),
    start_date: Optional[str] = Query(None, description="Inclusive start (YYYY-MM-DD), UTC"),
    end_date: Optional[str] = Query(None, description="Inclusive end (YYYY-MM-DD), UTC"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    """
    Returns the system security audit trail, newest first.
    Requires Admin RBAC role.

    Issue #69: real rows only — no seeded/fabricated placeholder entries.
    Paginated (limit capped at 200) with optional action and date-range
    filters so the ledger stays queryable as it grows.
    """
    query = (
        db.query(AuditLog, User.username)
        .outerjoin(User, AuditLog.user_id == User.id)
    )

    if action:
        query = query.filter(AuditLog.action == action.strip())
    if start_date:
        from datetime import datetime, timezone
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(AuditLog.timestamp >= start_dt)
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="start_date must be YYYY-MM-DD")
    if end_date:
        from datetime import datetime, timedelta, timezone
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt = end_dt + timedelta(days=1)  # inclusive day
            query = query.filter(AuditLog.timestamp < end_dt)
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="end_date must be YYYY-MM-DD")

    logs = (
        query.order_by(AuditLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for log, username in logs:
        ts_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else ""
        result.append(AuditLogResponse(
            id=log.id,
            user=username or "system",
            action=log.action or "EVENT",
            details=log.details or "",
            ip=log.ip_address or "",
            timestamp=ts_str
        ))

    return result


@router.get("/audit/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    """
    Issue #69: retention observability — total row count, oldest/newest event
    timestamps, and per-action counts so Admins can monitor ledger growth and
    plan archival. Read-only; the ledger itself stays immutable.
    """
    from sqlalchemy import func

    total = db.query(func.count(AuditLog.id)).scalar() or 0
    oldest = db.query(func.min(AuditLog.timestamp)).scalar()
    newest = db.query(func.max(AuditLog.timestamp)).scalar()

    by_action = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(20)
        .all()
    )

    return {
        "total_events": total,
        "oldest_event": oldest.strftime("%Y-%m-%d %H:%M:%S") if oldest else None,
        "newest_event": newest.strftime("%Y-%m-%d %H:%M:%S") if newest else None,
        "retention_policy": "immutable ledger; archive records older than "
                            "AUDIT_RETENTION_MONTHS (default 24) to cold storage "
                            "via the documented archival procedure (see README)",
        "events_by_action": {action: count for action, count in by_action},
    }
