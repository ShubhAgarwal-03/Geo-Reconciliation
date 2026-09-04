"""
backend/main.py

FastAPI entrypoint. Run from the project root with:
    uvicorn backend.main:app --reload

Then check http://localhost:8000/docs for interactive Swagger docs, and
http://localhost:8000/health to confirm the API can reach PostGIS.
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import get_connection
from backend.routers import entities, review_queue, upload, reconcile

app = FastAPI(title="Geospatial Reconciliation Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon-appropriate; tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entities.router)
app.include_router(review_queue.router)
app.include_router(upload.router)
app.include_router(reconcile.router)


@app.get("/health")
def health_check():
    """Confirms the API process is up AND can actually reach PostGIS —
    a plain 200 from FastAPI doesn't tell you the DB connection works."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT PostGIS_Version();")
                version = cur.fetchone()
        return {"status": "ok", "postgis_version": version}
    except Exception as e:
        return {"status": "error", "detail": str(e)}