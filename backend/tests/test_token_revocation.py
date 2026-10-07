"""
Regression tests for token revocation (Issue #60).
Run: python -m pytest tests/test_token_revocation.py -q
"""
import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, get_db
from app.models import User
from database_seed import seed_default_users
from app.core.security import create_access_token


@pytest.fixture
def client(monkeypatch):
    """Isolated SQLite + TestClient with seeded users (env-driven bootstrap passwords)."""
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "TestAdmin@2026")
    monkeypatch.setenv("BOOTSTRAP_ANALYST_PASSWORD", "TestAnalyst@2026")

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    seed_default_users(db)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, db
    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def _login(c, username, password):
    return c.post("/api/v1/auth/login", json={"username": username, "password": password})


def test_token_carries_version_claim(client):
    c, db = client
    res = _login(c, "admin", "TestAdmin@2026")
    assert res.status_code == 200
    token = res.json()["access_token"]

    from jose import jwt as jose_jwt
    from config import settings
    payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "ver" in payload
    assert payload["ver"] == 0


def test_revoke_endpoint_invalidates_existing_tokens(client):
    c, db = client
    # Login as admin -> valid token
    admin_login = _login(c, "admin", "TestAdmin@2026")
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Login as analyst -> capture their token
    an_login = _login(c, "analyst", "TestAnalyst@2026")
    assert an_login.status_code == 200
    analyst_token = an_login.json()["access_token"]

    # Analyst token works before revocation
    me_before = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {analyst_token}"})
    assert me_before.status_code == 200

    # Admin revokes analyst tokens
    revoke = c.post("/api/v1/auth/users/analyst/revoke-tokens", headers=headers)
    assert revoke.status_code == 200

    # Analyst's old token is now dead
    me_after = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {analyst_token}"})
    assert me_after.status_code == 401

    # Fresh login works again (new token carries new version)
    relogin = _login(c, "analyst", "TestAnalyst@2026")
    assert relogin.status_code == 200
    me_new = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {relogin.json()['access_token']}"})
    assert me_new.status_code == 200


def test_role_change_revokes_tokens_and_updates_role(client):
    c, db = client
    admin_login = _login(c, "admin", "TestAdmin@2026")
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    an_login = _login(c, "analyst", "TestAnalyst@2026")
    analyst_token = an_login.json()["access_token"]

    # Promote analyst to Reviewer
    change = c.post("/api/v1/auth/users/analyst/role?new_role=Reviewer", headers=headers)
    assert change.status_code == 200
    assert change.json()["role"] == "Reviewer"

    # Old token invalidated by the role change bump
    me_after = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {analyst_token}"})
    assert me_after.status_code == 401

    # Fresh login reflects new role
    relogin = _login(c, "analyst", "TestAnalyst@2026")
    assert relogin.json()["user"]["role"] == "Reviewer"


def test_invalid_role_rejected(client):
    c, db = client
    admin_login = _login(c, "admin", "TestAdmin@2026")
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    res = c.post("/api/v1/auth/users/analyst/role?new_role=Superadmin", headers=headers)
    assert res.status_code == 400


def test_admin_cannot_demote_self(client):
    c, db = client
    admin_login = _login(c, "admin", "TestAdmin@2026")
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    res = c.post("/api/v1/auth/users/admin/role?new_role=Viewer", headers=headers)
    assert res.status_code == 400


def test_non_admin_cannot_revoke(client):
    c, db = client
    an_login = _login(c, "analyst", "TestAnalyst@2026")
    headers = {"Authorization": f"Bearer {an_login.json()['access_token']}"}
    res = c.post("/api/v1/auth/users/reviewer/revoke-tokens", headers=headers)
    assert res.status_code == 403


def test_stale_version_token_rejected_directly(client):
    """A token minted with an old token_version must fail after a manual bump."""
    c, db = client
    user = db.query(User).filter(User.username == "analyst").first()
    stale_token = create_access_token(
        subject="analyst", role="Analyst", subsidiary="CMPDI", token_version=user.token_version
    )
    # Bump out-of-band (simulates password reset path elsewhere)
    user.token_version += 1
    db.commit()

    res = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {stale_token}"})
    assert res.status_code == 401
