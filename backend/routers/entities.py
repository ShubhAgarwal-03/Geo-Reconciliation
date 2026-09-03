"""
backend/routers/entities.py

GET /entities            — bbox-filtered, full polygons + confidence (zoomed-in view)
GET /entities/clustered  — bbox-filtered, grid-aggregated summary (zoomed-out view)
GET /entities/{canonical_uid} — single entity, full score breakdown

All bbox params are lon/lat (EPSG:4326), matching what a Leaflet map
gives you as its current bounds — the ST_Transform to the internal
matching SRID (config.MATCH_SRID, 32643) happens inside the SQL, and
every geometry returned to the client is transformed back to 4326 so
Leaflet can render it directly without the frontend needing to know
about the projected CRS at all.
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from backend.schema import ClusteredCell, EntityDetail, EntitySummary
from config import MATCH_SRID

router = APIRouter(prefix="/entities", tags=["entities"])

DEFAULT_LIMIT = 5000
MAX_LIMIT = 20000


@router.get("", response_model=list[EntitySummary])
def get_entities(
    min_lon: float = Query(..., description="Bounding box min longitude, EPSG:4326"),
    min_lat: float = Query(..., description="Bounding box min latitude, EPSG:4326"),
    max_lon: float = Query(..., description="Bounding box max longitude, EPSG:4326"),
    max_lat: float = Query(..., description="Bounding box max latitude, EPSG:4326"),
    limit: int = Query(DEFAULT_LIMIT, le=MAX_LIMIT, ge=1),
):
    """Full-resolution entities intersecting the given bbox. Intended for
    the zoomed-in map view — the frontend switches to /entities/clustered
    below whatever zoom threshold the team settles on."""
    query = f"""
        SELECT canonical_uid,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, confidence_score, needs_review
        FROM canonical_entities
        WHERE ST_Intersects(
            geom,
            ST_Transform(ST_MakeEnvelope(%(min_lon)s, %(min_lat)s, %(max_lon)s, %(max_lat)s, 4326), {MATCH_SRID})
        )
        LIMIT %(limit)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {
                "min_lon": min_lon, "min_lat": min_lat,
                "max_lon": max_lon, "max_lat": max_lat,
                "limit": limit,
            })
            rows = cur.fetchall()

    return [
        EntitySummary(
            canonical_uid=r["canonical_uid"],
            geometry=json.loads(r["geojson"]),
            area_m2=r["area_m2"],
            source_count=r["source_count"],
            sources=r["sources"],
            confidence_score=r["confidence_score"],
            needs_review=r["needs_review"],
        )
        for r in rows
    ]


@router.get("/clustered", response_model=list[ClusteredCell])
def get_entities_clustered(
    min_lon: float = Query(..., description="Bounding box min longitude, EPSG:4326"),
    min_lat: float = Query(..., description="Bounding box min latitude, EPSG:4326"),
    max_lon: float = Query(..., description="Bounding box max longitude, EPSG:4326"),
    max_lat: float = Query(..., description="Bounding box max latitude, EPSG:4326"),
    grid_size_m: float = Query(100.0, gt=0, description="Grid cell size in metres, in the projected matching CRS"),
):
    """Coarse summary for the zoomed-out map view: entities are snapped
    to a grid (ST_SnapToGrid on each entity's centroid, in the projected
    CRS) and aggregated per cell — count + average confidence per cell,
    not individual geometries."""
    query = f"""
        WITH filtered AS (
            SELECT geom, confidence_score
            FROM canonical_entities
            WHERE ST_Intersects(
                geom,
                ST_Transform(ST_MakeEnvelope(%(min_lon)s, %(min_lat)s, %(max_lon)s, %(max_lat)s, 4326), {MATCH_SRID})
            )
        ),
        gridded AS (
            SELECT ST_SnapToGrid(ST_Centroid(geom), %(grid_size)s) AS cell, confidence_score
            FROM filtered
        )
        SELECT
            ST_X(ST_Transform(cell, 4326)) AS lon,
            ST_Y(ST_Transform(cell, 4326)) AS lat,
            COUNT(*) AS count,
            AVG(confidence_score) AS avg_confidence
        FROM gridded
        GROUP BY cell
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {
                "min_lon": min_lon, "min_lat": min_lat,
                "max_lon": max_lon, "max_lat": max_lat,
                "grid_size": grid_size_m,
            })
            rows = cur.fetchall()

    return [
        ClusteredCell(lon=r["lon"], lat=r["lat"], count=r["count"], avg_confidence=r["avg_confidence"])
        for r in rows
    ]


@router.get("/{canonical_uid}", response_model=EntityDetail)
def get_entity_detail(canonical_uid: str):
    """Full detail for one entity, including the score breakdown
    (avg_match_score, avg_iou_agreement) needed for the click-through
    panel — both are None for a single-source entity that was never
    matched, which the frontend should render as 'never cross-validated'
    rather than as a numeric 0."""
    query = """
        SELECT canonical_uid,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, member_feature_ids,
               avg_match_score, avg_iou_agreement, confidence_score,
               needs_review, tile_id
        FROM canonical_entities
        WHERE canonical_uid = %(canonical_uid)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {"canonical_uid": canonical_uid})
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No entity with canonical_uid={canonical_uid}")

    return EntityDetail(
        canonical_uid=row["canonical_uid"],
        geometry=json.loads(row["geojson"]),
        area_m2=row["area_m2"],
        source_count=row["source_count"],
        sources=row["sources"],
        confidence_score=row["confidence_score"],
        needs_review=row["needs_review"],
        member_feature_ids=row["member_feature_ids"],
        avg_match_score=row["avg_match_score"],
        avg_iou_agreement=row["avg_iou_agreement"],
        tile_id=row["tile_id"],
    )