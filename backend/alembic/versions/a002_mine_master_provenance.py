"""Add mine_master / data_sources provenance columns (was migrations/002_*.sql)

Source of truth: backend/migrations/002_add_missing_mine_master_and_provenance_columns.sql
Behavior preserved: idempotent IF NOT EXISTS adds + indexes, safe defaults.

Revision ID: a002_mine_master_provenance
Revises: a001_add_data_origin
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "a002_mine_master_provenance"
down_revision: Union[str, None] = "a001_add_data_origin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(bind, table: str) -> set:
    inspector = inspect(bind)
    if table not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    pg = bind.dialect.name == "postgresql"

    def add_col(table: str, col: str, ddl_type: str, default: str = ""):
        existing = _cols(bind, table)
        if col in existing:
            return
        default_clause = f" DEFAULT {default}" if default else ""
        stmt = (f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {ddl_type}{default_clause}"
                if pg else
                f"ALTER TABLE {table} ADD COLUMN {col} {ddl_type}{default_clause}")
        op.execute(stmt)

    add_col("mine_master", "parent_company", "VARCHAR(150)")
    add_col("mine_master", "block", "VARCHAR(150)")
    add_col("mine_master", "coalfield", "VARCHAR(150)")
    add_col("mine_master", "sector", "VARCHAR(50)")
    add_col("mine_master", "captive_or_commercial", "VARCHAR(50)")
    add_col("mine_master", "financial_year", "VARCHAR(20)")
    add_col("mine_master", "source_chapter", "VARCHAR(100)")
    add_col("mine_master", "retrieved_at", "TIMESTAMPTZ")
    add_col("mine_master", "verification_status", "VARCHAR(50)", "'UNKNOWN'")
    add_col("mine_master", "data_origin", "VARCHAR(30)", "'UNKNOWN'")

    # Performance & dimensional indexes on mine_master
    op.execute("CREATE INDEX IF NOT EXISTS ix_mine_master_sector ON mine_master (sector)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mine_master_data_origin ON mine_master (data_origin)")

    # data_sources column
    add_col("data_sources", "chapter", "VARCHAR(100)")


def downgrade() -> None:
    bind = op.get_bind()
    pg = bind.dialect.name == "postgresql"

    def drop_col(table: str, col: str):
        if pg:
            op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")
        else:
            if col in _cols(bind, table):
                try:
                    op.execute(f"ALTER TABLE {table} DROP COLUMN {col}")
                except Exception:
                    pass  # very old SQLite: leave column, acceptable in dev/test

    drop_col("data_sources", "chapter")
    op.execute("DROP INDEX IF EXISTS ix_mine_master_data_origin")
    op.execute("DROP INDEX IF EXISTS ix_mine_master_sector")
    for col in ("data_origin", "verification_status", "retrieved_at", "source_chapter",
                "financial_year", "captive_or_commercial", "sector", "coalfield",
                "block", "parent_company"):
        drop_col("mine_master", col)
