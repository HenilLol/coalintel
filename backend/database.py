from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=False
    )
    # Test connection
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to local SQLite database when PostgreSQL is not running
    import os
    project_root = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(project_root) == "backend":
        project_root = os.path.dirname(project_root)
    db_file = os.path.join(project_root, "storage", "coalintel_db.sqlite")
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    sqlite_url = f"sqlite:///{db_file}"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
