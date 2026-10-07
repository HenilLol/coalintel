"""Baseline: stamp existing schema

Marks the schema as it exists at repository state without executing DDL.
Deployments that already have tables (created via Base.metadata.create_all or
the legacy SQL scripts) should run:  alembic stamp baseline-create-all

Revision ID: baseline_create_all
Revises:
Create Date: 2026-10-08
"""
from typing import Sequence, Union

revision: str = "baseline_create_all"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No DDL: existing deployments already have the tables.

    Fresh deployments get the full schema from Base.metadata.create_all at
    first boot (development) or by running alembic upgrade head after a
    create_all bootstrap. This revision exists so the two follow-up column
    migrations have a parent revision to attach to.
    """
    pass


def downgrade() -> None:
    pass
