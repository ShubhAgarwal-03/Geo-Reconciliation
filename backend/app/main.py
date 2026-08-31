from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session

app = FastAPI(
    title="Geospatial Data Platform API",
    version="0.1.0",
    description="Backend API for Geospatial Data Platform",
)

# CORS configuration for cross-origin frontend communication
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Confirms the FastAPI server is running."""
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
async def db_health_check(db: AsyncSession = Depends(get_async_session)):
    """Confirms database connectivity by running a lightweight query."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error", "database": "disconnected", "error": str(e)},
        )


# Router inclusions (Module routers will be registered here as they are added)
# Example:
# from app.routers import entities
# app.include_router(entities.router, prefix="/api/v1", tags=["Entities"])
