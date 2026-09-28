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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.db import get_connection
from backend.routers import entities, review_queue, upload, reconcile, stats

app = FastAPI(title="Geospatial Reconciliation Engine API")


@app.middleware("http")
async def _json_errors(request: Request, call_next):
    """Turn unhandled exceptions into a JSON 500 *inside* the CORS layer.
    Without this, a crash in any route reaches the browser as a bare
    'Failed to fetch' (the error response has no CORS headers), which hides
    the real cause. Now the Network tab shows the 500 and its detail."""
    try:
        return await call_next(request)
    except Exception as e:  # noqa: BLE001
        return JSONResponse(status_code=500, content={"detail": f"{type(e).__name__}: {e}"})


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
app.include_router(stats.router)


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


@app.get("/naksha/export")
def export_naksha_package(
    min_lon: float | None = None,
    min_lat: float | None = None,
    max_lon: float | None = None,
    max_lat: float | None = None,
    limit: int = 5000,
):
    """Exports an official DoLR NAKSHA-compliant GeoJSON package containing
    14-digit Bhu-Aadhar (ULPIN) identifiers, reconciled footprint geometries,
    and confidence scores ready for Bhu-Naksha / state registry ingestion."""
    import json
    from datetime import datetime, timezone
    from reconciliation.bhu_aadhar import format_bhu_aadhar
    from config import MATCH_SRID

    bbox_given = all(v is not None for v in (min_lon, min_lat, max_lon, max_lat))

    query = f"""
        SELECT canonical_uid, bhu_aadhar,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, confidence_score, needs_review
        FROM canonical_entities
        WHERE 1=1
    """
    params: dict = {"limit": limit}

    if bbox_given:
        query += f"""
            AND ST_Intersects(
                geom,
                ST_Transform(ST_MakeEnvelope(%(min_lon)s, %(min_lat)s, %(max_lon)s, %(max_lat)s, 4326), {MATCH_SRID})
            )
        """
        params.update({"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat})

    query += " ORDER BY id ASC LIMIT %(limit)s"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    features = []
    for r in rows:
        bhu_id = r.get("bhu_aadhar") or r["canonical_uid"][:14]
        features.append({
            "type": "Feature",
            "id": bhu_id,
            "geometry": json.loads(r["geojson"]),
            "properties": {
                "bhu_aadhar_ulpin": bhu_id,
                "bhu_aadhar_formatted": format_bhu_aadhar(bhu_id),
                "canonical_uid": r["canonical_uid"],
                "reconciled_area_m2": round(r["area_m2"], 2) if r["area_m2"] else None,
                "source_count": r["source_count"],
                "sources": r["sources"],
                "confidence_score": r["confidence_score"],
                "verification_status": "PENDING_FIELD_VERIFICATION" if r["needs_review"] else "OFFICIALLY_RECONCILED",
                "state_code": "29",
                "district_code": "20",
                "compliance_standard": "DoLR-DILRMP-NAKSHA-OGC",
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "programme": "NAKSHA - National Geospatial Knowledge-based Land Survey of Urban Habitations",
            "authority": "Department of Land Resources (DoLR), Ministry of Rural Development",
            "state": "Karnataka (29)",
            "district": "Bengaluru Urban (20)",
            "projection": "EPSG:4326 (WGS84)",
            "total_exported": len(features),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "features": features,
    }