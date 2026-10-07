"""Add documents.processing_started_at (Issue #58)

Revision ID: a004_document_processing_started_at
Revises: a003_user_token_version
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a004_document_processing_started_at"
down_revision: Union[str, None] = "a003_user_token_version"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ")
    else:
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("documents")}
        if "processing_started_at" not in cols:
            op.execute("ALTER TABLE documents ADD COLUMN processing_started_at TIMESTAMPTZ")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS processing_started_at")
    else:
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("documents")}
        if "processing_started_at" in cols:
            try:
                op.execute("ALTER TABLE documents DROP COLUMN processing_started_at")
            except Exception:
                pass
