"""Add users.token_version for JWT revocation (Issue #60)

Revision ID: a003_user_token_version
Revises: a002_mine_master_provenance
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a003_user_token_version"
down_revision: Union[str, None] = "a002_mine_master_provenance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")
    else:
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("users")}
        if "token_version" not in cols:
            op.execute("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS token_version")
    else:
        from sqlalchemy import inspect
        inspector = inspect(bind)
        cols = {c["name"] for c in inspector.get_columns("users")}
        if "token_version" in cols:
            try:
                op.execute("ALTER TABLE users DROP COLUMN token_version")
            except Exception:
                pass
