"""
Regression tests for audit ledger API (Issue #69).
Run: python -m pytest tests/test_audit_retention.py -q
"""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.security import get_password_hash
from database_seed import seed_default_users


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "TestAdmin@2026")
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    seed_default_users(db)

    # A known user for user-scoped log rows
    u = User(username="auditor1", hashed_password=get_password_hash("x"), role="Admin", subsidiary="CIL HQ")
    db.add(u)
    db.commit()
    db.refresh(u)

    now = datetime.now(timezone.utc)
    db.add(AuditLog(user_id=u.id, action="LOGIN_SUCCESS", details="ok", ip_address="10.0.0.1",
                    timestamp=now - timedelta(days=2)))
    db.add(AuditLog(user_id=u.id, action="LOGIN_FAILED", details="bad", ip_address="10.0.0.2",
                    timestamp=now - timedelta(days=1)))
    db.add(AuditLog(user_id=u.id, action="DOCUMENT_UPLOAD", details="up", ip_address="10.0.0.1",
                    timestamp=now))
    db.commit()
    # deterministic window anchors for the date-range test
    old_login_ts = (now - timedelta(days=2)).strftime("%Y-%m-%d")
    failed_ts = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        # login returns the token in the body; use the Authorization header.
        # NOTE: the login itself writes a LOGIN_SUCCESS audit row into the
        # ledger — snapshot the post-login row count so assertions are exact.
        login = c.post("/api/v1/auth/login", json={"username": "admin", "password": "TestAdmin@2026"})
        assert login.status_code == 200
        token = login.json()["access_token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        baseline = db.query(AuditLog).count()
        yield c, db, u, baseline, failed_ts
    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def test_audit_logs_returns_real_rows_only(client):
    """Issue #69: real rows only — no fabricated baseline logs."""
    c, db, u, baseline, _ = client
    res = c.get("/api/v1/audit/logs")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == baseline
    # newest first
    assert body[0]["action"] in ("LOGIN_SUCCESS", "DOCUMENT_UPLOAD")
    # real fields, not placeholders
    assert body[0]["ip"] != "192.168.1.1" or body[0]["action"] != "CONFLICT_RESOLVE"
    assert "user" in body[0]


def test_empty_ledger_returns_empty_not_fabricated(client):
    """Issue #69 regression: previously <3 rows returned 3 invented baseline
    logs with fake IPs and timestamps. Must return [] instead."""
    c, db, _, _, _ = client
    db.query(AuditLog).delete()
    db.commit()
    res = c.get("/api/v1/audit/logs")
    assert res.status_code == 200
    assert res.json() == []


def test_action_filter(client):
    c, db, _, _, _ = client
    res = c.get("/api/v1/audit/logs?action=LOGIN_FAILED")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["action"] == "LOGIN_FAILED"


def test_date_range_filter(client):
    c, db, _, _, failed_ts = client
    # Window = exactly the day of the LOGIN_FAILED row: includes it,
    # excludes the 2-day-old LOGIN_SUCCESS, and (deterministically) the
    # DOCUMENT_UPLOAD 'now' row only if it falls on the same UTC date.
    res = c.get(f"/api/v1/audit/logs?start_date={failed_ts}&end_date={failed_ts}")
    assert res.status_code == 200
    body = res.json()
    actions = [r["action"] for r in body]
    assert "LOGIN_FAILED" in actions
    # the 2-day-old seeded LOGIN_SUCCESS must NOT be in this window
    assert "LOGIN_SUCCESS" not in [r["action"] for r in body if r["user"] == "auditor1"]


def test_limit_capped(client):
    c, db, _, _, _ = client
    res = c.get("/api/v1/audit/logs?limit=99999")
    assert res.status_code == 422  # le=MAX_PAGE_LIMIT validation


def test_pagination_offset(client):
    c, db, _, _, _ = client
    baseline = db.query(AuditLog).count()
    page1 = c.get("/api/v1/audit/logs?limit=2&offset=0").json()
    page2 = c.get("/api/v1/audit/logs?limit=2&offset=2").json()
    assert len(page1) == 2
    assert len(page2) == max(0, baseline - 2)
    ids1 = {r["id"] for r in page1}
    ids2 = {r["id"] for r in page2}
    assert not (ids1 & ids2)  # no overlap


def test_stats_endpoint(client):
    c, db, _, _, _ = client
    res = c.get("/api/v1/audit/stats")
    assert res.status_code == 200
    body = res.json()
    assert body["total_events"] == db.query(AuditLog).count()
    assert body["oldest_event"] is not None
    assert body["newest_event"] is not None
    assert body["events_by_action"]["LOGIN_SUCCESS"] >= 1


def test_non_admin_forbidden(client):
    """Audit ledger is Admin-only."""
    c, db, _, _, _ = client
    # signup creates an Analyst (non-privileged) — its token must not read the ledger
    res = c.post("/api/v1/auth/signup", json={
        "username": "external1", "password": "Passw0rd!123", "subsidiary": "ECL"
    })
    assert res.status_code == 201
    new_token = res.json()["access_token"]
    denied = c.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {new_token}"})
    assert denied.status_code == 403
