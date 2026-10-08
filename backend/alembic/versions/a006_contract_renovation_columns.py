"""Add contract renovation columns (PR #53) to mine_master / mine_yearly_metrics / coal_blocks

Ports backend/migrations/migrate_contract_columns.py (the manual sqlite script
shipped with the mines contract renovation) into a proper Alembic revision so
the schema changes are tracked and reproducible, per the migration policy
established in Issue #63.

Revision ID: a006_contract_renovation_columns
Revises: a005_audit_log_indexes
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "a006_contract_renovation_columns"
down_revision: Union[str, None] = "a005_audit_log_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(bind, table: str) -> set:
    inspector = inspect(bind)
    if table not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def _add(bind, table: str, col: str, ddl: str):
    existing = _cols(bind, table)
    if col in existing:
        return
    op.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")


def upgrade() -> None:
    bind = op.get_bind()
    pg = bind.dialect.name == "postgresql"

    # --- mine_master (from migrate_contract_columns.py) ---
    mm_cols = {
        "block_name": "VARCHAR(150)",
        "commodity": "VARCHAR(50) DEFAULT 'coal'",
        "updated_at": "TIMESTAMP",
    }
    for col, ddl in mm_cols.items():
        if pg:
            op.execute(f"ALTER TABLE mine_master ADD COLUMN IF NOT EXISTS {col} {ddl}")
        elif col not in _cols(bind, "mine_master"):
            op.execute(f"ALTER TABLE mine_master ADD COLUMN {col} {ddl}")

    # --- mine_yearly_metrics ---
    mym_cols = {
        "coal_grade": "VARCHAR(50)",
        "mine_type": "VARCHAR(50)",
        "mining_method": "VARCHAR(100)",
        "operational_status": "VARCHAR(50)",
        "production_status": "VARCHAR(50)",
        "mine_opening_permission": "BOOLEAN",
        "captive_or_commercial": "VARCHAR(50)",
        "star_rating_category": "VARCHAR(50)",
        "employment": "INTEGER",
        "as_of_date": "VARCHAR(30)",
        "updated_at": "TIMESTAMP",
    }
    for col, ddl in mym_cols.items():
        if pg:
            op.execute(f"ALTER TABLE mine_yearly_metrics ADD COLUMN IF NOT EXISTS {col} {ddl}")
        elif col not in _cols(bind, "mine_yearly_metrics"):
            op.execute(f"ALTER TABLE mine_yearly_metrics ADD COLUMN {col} {ddl}")

    # --- coal_blocks ---
    cb_cols = {
        "normalized_name": "VARCHAR(150)",
        "mine_name": "VARCHAR(150)",
        "mine_id": "VARCHAR(100)",
        "company": "VARCHAR(150)",
        "company_name": "VARCHAR(150)",
        "operational_status": "VARCHAR(50) DEFAULT 'operational'",
        "captive_or_commercial": "VARCHAR(50)",
        "target_production_mt": "NUMERIC(18, 6)",
        "peak_rated_capacity_mtpa": "NUMERIC(18, 6)",
        "data_origin": "VARCHAR(30) DEFAULT 'government'",
        "verification_status": "VARCHAR(30) DEFAULT 'verified'",
        "updated_at": "TIMESTAMP",
    }
    for col, ddl in cb_cols.items():
        if pg:
            op.execute(f"ALTER TABLE coal_blocks ADD COLUMN IF NOT EXISTS {col} {ddl}")
        elif col not in _cols(bind, "coal_blocks"):
            op.execute(f"ALTER TABLE coal_blocks ADD COLUMN {col} {ddl}")


def downgrade() -> None:
    bind = op.get_bind()
    pg = bind.dialect.name == "postgresql"

    def drop(table: str, col: str):
        if pg:
            op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")
        else:
            if col in _cols(bind, table):
                try:
                    op.execute(f"ALTER TABLE {table} DROP COLUMN {col}")
                except Exception:
                    pass

    for col in ("updated_at", "verification_status", "data_origin",
                "peak_rated_capacity_mtpa", "target_production_mt", "captive_or_commercial",
                "operational_status", "company_name", "company", "mine_id",
                "mine_name", "normalized_name"):
        drop("coal_blocks", col)
    for col in ("updated_at", "as_of_date", "employment", "star_rating_category",
                "captive_or_commercial", "mine_opening_permission", "production_status",
                "operational_status", "mining_method", "mine_type", "coal_grade"):
        drop("mine_yearly_metrics", col)
    for col in ("updated_at", "commodity", "block_name"):
        drop("mine_master", col)
