"""
COALINTEL Alembic migration environment.

Resolves the database URL from the application settings (config.py), so the
same .env / environment drives both the app and migrations. Never hardcodes
credentials.
"""
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make backend/ importable when alembic runs from the backend directory
sys.path.insert(0, ".")

from config import settings  # noqa: E402
from database import Base     # noqa: E402
import app.models  # noqa: F401, E402  (registers all ORM models with Base)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject the live database URL from application settings
db_url = settings.DATABASE_URL.strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # compare against the ORM metadata for autogenerate
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
