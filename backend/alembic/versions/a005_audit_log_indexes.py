"""Add audit_logs composite index (Issue #69)

Index: (user_id, timestamp) — supports the admin user-scoped audit
drill-down query pattern. The single-column timestamp index already exists
in the model; this revision adds the composite.

Revision ID: a005_audit_log_indexes
Revises: a004_document_processing_started_at
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a005_audit_log_indexes"
down_revision: Union[str, None] = "a004_document_processing_started_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id_timestamp ON audit_logs (user_id, timestamp)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_user_id_timestamp")
