"""Add data_origin to extracted_metrics (was migrations/001_*.sql)

Source of truth: backend/migrations/001_add_data_origin_to_extracted_metrics.sql
Behavior preserved: idempotent column + index addition, safe DEFAULT 'UNKNOWN'.

Revision ID: a001_add_data_origin
Revises: baseline_create_all
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a001_add_data_origin"
down_revision: Union[str, None] = "baseline_create_all"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE extracted_metrics ADD COLUMN IF NOT EXISTS data_origin VARCHAR(30) DEFAULT 'UNKNOWN'")
        op.execute("CREATE INDEX IF NOT EXISTS ix_extracted_metrics_data_origin ON extracted_metrics (data_origin)")
    else:
        # SQLite (tests/CI) lacks IF NOT EXISTS on ADD COLUMN; inspect instead
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("extracted_metrics")}
        if "data_origin" not in cols:
            op.execute("ALTER TABLE extracted_metrics ADD COLUMN data_origin VARCHAR(30) DEFAULT 'UNKNOWN'")
        op.execute("CREATE INDEX IF NOT EXISTS ix_extracted_metrics_data_origin ON extracted_metrics (data_origin)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_extracted_metrics_data_origin")
        op.execute("ALTER TABLE extracted_metrics DROP COLUMN IF EXISTS data_origin")
    else:
        # SQLite historically cannot DROP COLUMN before 3.35; guard on presence
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("extracted_metrics")}
        if "data_origin" in cols:
            try:
                op.execute("ALTER TABLE extracted_metrics DROP COLUMN data_origin")
            except Exception:
                pass  # old SQLite: column stays, acceptable for dev/test downgrade
        op.execute("DROP INDEX IF EXISTS ix_extracted_metrics_data_origin")
