import logging
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
# Ensure all models are imported so Base metadata registers all 7 tables
from app.models import User, Document, ExtractedMetric, DocumentChunk, DataConflict, Report, AuditLog
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("COALINTEL-SEED")


def init_db(db: Session) -> None:
    """
    Creates all 7 PostgreSQL database tables if they do not exist and seeds initial default users.
    """
    logger.info("Creating database tables if not present...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")

    # Seed Default Users
    default_users = [
        {
            "username": "admin",
            "password": "Admin@123",
            "full_name": "System Administrator",
            "email": "admin@coalintel.cil.in",
            "role": "Admin",
            "subsidiary": "CIL HQ"
        },
        {
            "username": "analyst",
            "password": "Analyst@123",
            "full_name": "CMPDI Mining Analyst",
            "email": "analyst@cmpdi.co.in",
            "role": "Analyst",
            "subsidiary": "CMPDI"
        },
        {
            "username": "reviewer",
            "password": "Reviewer@123",
            "full_name": "ECL Report Reviewer",
            "email": "reviewer@easterncoal.in",
            "role": "Reviewer",
            "subsidiary": "ECL"
        },
        {
            "username": "auditor",
            "password": "Auditor@123",
            "full_name": "Ministry Technical Auditor",
            "email": "auditor@coal.gov.in",
            "role": "Viewer",
            "subsidiary": "Ministry of Coal"
        }
    ]

    for user_data in default_users:
        existing_user = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing_user:
            new_user = User(
                username=user_data["username"],
                hashed_password=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                email=user_data["email"],
                role=user_data["role"],
                subsidiary=user_data["subsidiary"]
            )
            db.add(new_user)
            logger.info(f"Seeded user: {user_data['username']} (Role: {user_data['role']})")
        else:
            logger.info(f"User '{user_data['username']}' already exists. Skipping seed.")

    db.commit()
    logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
