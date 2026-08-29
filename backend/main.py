import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("COALINTEL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup & shutdown lifespan events.
    Verifies storage directory structures and initializes PostgreSQL tables on startup.
    """
    logger.info("Initializing COALINTEL Backend Foundation...")
    
    # Ensure local storage directories exist
    for storage_path in [settings.UPLOAD_DIR, settings.CHROMA_DB_DIR, settings.REPORT_DIR]:
        os.makedirs(storage_path, exist_ok=True)
        logger.info(f"Storage path verified: {storage_path}")

    # Initialize PostgreSQL Tables (Day 1 Persistence Foundation)
    try:
        from database import engine, Base
        import app.models  # Registers all 7 models with Base metadata
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database tables verified and created successfully.")
    except Exception as e:
        logger.warning(f"PostgreSQL connection note during startup: {e}")

    logger.info(f"COALINTEL Backend initialized successfully in {settings.ENVIRONMENT} mode.")
    yield
    logger.info("COALINTEL Backend shut down cleanly.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Evidence-Driven Mining Intelligence & Reporting Platform (SIH26023)",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.query import router as query_router
from app.api.validation import router as validation_router
from app.api.reports import router as reports_router

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(query_router, prefix=settings.API_V1_STR)
app.include_router(validation_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """System Health Check Endpoint."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "llm_provider": settings.LLM_PROVIDER,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
