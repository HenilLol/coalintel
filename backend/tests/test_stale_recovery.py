"""
Regression tests for stale-processing recovery (Issue #58).
Run: python -m pytest tests/test_stale_recovery.py -q
"""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from app.models.document import Document
from app.services.processing_pipeline import recover_stale_processing_documents


@pytest.fixture
def db_session():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def _make_doc(db, **kw):
    doc = Document(
        filename=kw.get("filename", "legacy.pdf"),
        file_path=kw.get("file_path", "/nonexistent/missing.pdf"),
        file_type=kw.get("file_type", "pdf"),
        file_size_bytes=kw.get("file_size_bytes", 100),
        file_hash=kw.get("file_hash", f"hash-{datetime.now(timezone.utc).timestamp()}"),
        uploaded_by=kw.get("uploaded_by"),
        status=kw.get("status", "PROCESSING"),
        created_at=kw.get("created_at"),
        processing_started_at=kw.get("processing_started_at"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def test_recent_processing_not_marked_stale(db_session):
    """Issue #58 core regression: uploaded 30 min ago, started processing 2 min ago.
    Old code (created_at comparison) would falsely FAIL this; new code must not."""
    db = db_session
    now = datetime.now(timezone.utc)
    doc = _make_doc(
        db,
        filename="inflight.pdf",
        created_at=now - timedelta(minutes=30),          # OLD upload time
        processing_started_at=now - timedelta(minutes=2),  # recent processing start
        file_path="/nonexistent/inflight.pdf",             # binary missing (worst case)
    )
    recovered = recover_stale_processing_documents(db, stale_minutes=15)
    db.refresh(doc)
    assert recovered == 0
    assert doc.status == "PROCESSING"  # NOT falsely failed


def test_truly_stale_doc_with_missing_binary_fails(db_session):
    """Started processing 30 min ago, binary gone -> legitimately FAILED."""
    db = db_session
    now = datetime.now(timezone.utc)
    doc = _make_doc(
        db,
        filename="orphan.pdf",
        created_at=now - timedelta(minutes=40),
        processing_started_at=now - timedelta(minutes=30),
        file_path="/nonexistent/orphan.pdf",
    )
    recovered = recover_stale_processing_documents(db, stale_minutes=15)
    db.refresh(doc)
    assert recovered == 1
    assert doc.status == "FAILED"
    assert "re-upload" in doc.error_message


def test_legacy_rows_without_started_at_fall_back_to_created_at(db_session):
    """Pre-migration rows (processing_started_at NULL) use created_at — recovery
    still works for genuinely orphaned legacy records."""
    db = db_session
    now = datetime.now(timezone.utc)
    doc = _make_doc(
        db,
        filename="legacy_orphan.pdf",
        created_at=now - timedelta(minutes=60),
        processing_started_at=None,
        file_path="/nonexistent/legacy.pdf",
    )
    recovered = recover_stale_processing_documents(db, stale_minutes=15)
    db.refresh(doc)
    assert recovered == 1
    assert doc.status == "FAILED"


def test_stale_with_existing_binary_not_failed(db_session):
    """Stale but binary present -> left eligible for reprocessing, not FAILED."""
    db = db_session
    now = datetime.now(timezone.utc)
    # a path that exists
    real_path = os.path.abspath(__file__)
    doc = _make_doc(
        db,
        filename="recoverable.pdf",
        created_at=now - timedelta(minutes=60),
        processing_started_at=now - timedelta(minutes=60),
        file_path=real_path,
    )
    recovered = recover_stale_processing_documents(db, stale_minutes=15)
    db.refresh(doc)
    assert recovered == 0
    assert doc.status == "PROCESSING"


def test_processing_start_stamp_set_on_pipeline_start(db_session):
    """Unit-level: the column exists and accepts the timestamp."""
    db = db_session
    now = datetime.now(timezone.utc)
    doc = _make_doc(
        db,
        filename="stamped.pdf",
        created_at=now - timedelta(minutes=5),
        processing_started_at=now,
    )
    db.refresh(doc)
    assert doc.processing_started_at is not None
    assert doc.processing_started_at >= doc.created_at - timedelta(seconds=1)
