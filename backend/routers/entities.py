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
import unicodedata
from pathlib import Path

from datetime import datetime, timezone
from backend.schema import ResolveRequest, ResolveResponse  # add to your existing schema import line

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
        SELECT canonical_uid, bhu_aadhar,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, confidence_score, needs_review,
               height_m, estimated_floors, elevation_roof_m, elevation_ground_m
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
            bhu_aadhar=r.get("bhu_aadhar"),
            geometry=json.loads(r["geojson"]),
            area_m2=r["area_m2"],
            source_count=r["source_count"],
            sources=r["sources"],
            confidence_score=r["confidence_score"],
            needs_review=r["needs_review"],
            height_m=float(r["height_m"]) if r.get("height_m") is not None else None,
            estimated_floors=r.get("estimated_floors"),
            elevation_roof_m=float(r["elevation_roof_m"]) if r.get("elevation_roof_m") is not None else None,
            elevation_ground_m=float(r["elevation_ground_m"]) if r.get("elevation_ground_m") is not None else None,
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


def _normalize_search_term(term: str) -> str:
    """Normalize input string:
    - Normalizes Unicode NFKD (converts stylized / mathematical bold / italic e.g. 𝐓𝐃𝐑𝟏𝐖𝟕𝐁𝟓𝟐𝐄 to standard ASCII TDR1W7B52E)
    - Strips whitespace
    """
    if not term:
        return ""
    return unicodedata.normalize("NFKD", term).strip()


@router.get("/search", response_model=list[EntitySummary])
def search_entities(
    q: str = Query(..., min_length=1, description="Search query: 14-digit Bhu-Aadhar, 10-char PNIU suffix, or canonical UID"),
    limit: int = Query(20, le=100, ge=1),
):
    """Searches canonical entities across Bangalore by Bhu-Aadhar or canonical_uid.
    Supports:
    - Full 14-digit Bhu-Aadhar (e.g. 2920TDR1W7B52E)
    - 10-character PNIU centroid geohash suffix (e.g. TDR1W7B52E)
    - Stylized / mathematical unicode font input (e.g. 𝐓𝐃𝐑𝟏𝐖𝟕𝐁𝟓𝟐𝐄)
    - Partial prefix or suffix matches
    - UUID / canonical_uid
    """
    cleaned = _normalize_search_term(q)
    if not cleaned:
        return []

    pattern = f"%{cleaned}%"
    suffix = f"%{cleaned}"

    query = f"""
        SELECT canonical_uid, bhu_aadhar,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, confidence_score, needs_review,
               height_m, estimated_floors, elevation_roof_m, elevation_ground_m
        FROM canonical_entities
        WHERE bhu_aadhar ILIKE %(pattern)s
           OR canonical_uid ILIKE %(pattern)s
        ORDER BY
            CASE
                WHEN bhu_aadhar ILIKE %(exact)s THEN 1
                WHEN bhu_aadhar ILIKE %(suffix)s THEN 2
                WHEN canonical_uid ILIKE %(exact)s THEN 3
                ELSE 4
            END,
            confidence_score DESC
        LIMIT %(limit)s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {
                "pattern": pattern,
                "exact": cleaned,
                "suffix": suffix,
                "limit": limit,
            })
            rows = cur.fetchall()

    return [
        EntitySummary(
            canonical_uid=r["canonical_uid"],
            bhu_aadhar=r.get("bhu_aadhar"),
            geometry=json.loads(r["geojson"]),
            area_m2=r["area_m2"],
            source_count=r["source_count"],
            sources=r["sources"],
            confidence_score=r["confidence_score"],
            needs_review=r["needs_review"],
            height_m=float(r["height_m"]) if r.get("height_m") is not None else None,
            estimated_floors=r.get("estimated_floors"),
            elevation_roof_m=float(r["elevation_roof_m"]) if r.get("elevation_roof_m") is not None else None,
            elevation_ground_m=float(r["elevation_ground_m"]) if r.get("elevation_ground_m") is not None else None,
        )
        for r in rows
    ]


@router.get("/{canonical_uid}", response_model=EntityDetail)
def get_entity_detail(canonical_uid: str):
    """Full detail for one entity by canonical_uid or bhu_aadhar.
    Accepts full 14-char Bhu-Aadhar, 10-char PNIU suffix, or UUID,
    handling any mathematical / unicode stylized formatting."""
    cleaned = _normalize_search_term(canonical_uid)

    query = """
        SELECT canonical_uid, bhu_aadhar,
               ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson,
               area_m2, source_count, sources, member_feature_ids,
               avg_match_score, avg_iou_agreement, confidence_score,
               needs_review, tile_id,
               height_m, estimated_floors, elevation_roof_m, elevation_ground_m
        FROM canonical_entities
        WHERE canonical_uid ILIKE %(identifier)s
           OR bhu_aadhar ILIKE %(identifier)s
           OR bhu_aadhar ILIKE %(suffix)s
        ORDER BY
            CASE
                WHEN bhu_aadhar ILIKE %(identifier)s THEN 1
                WHEN canonical_uid ILIKE %(identifier)s THEN 2
                ELSE 3
            END
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {
                "identifier": cleaned,
                "suffix": f"%{cleaned}",
            })
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No entity with identifier={canonical_uid} (cleaned: {cleaned})")

    return EntityDetail(
        canonical_uid=row["canonical_uid"],
        bhu_aadhar=row.get("bhu_aadhar"),
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
        height_m=float(row["height_m"]) if row.get("height_m") is not None else None,
        estimated_floors=row.get("estimated_floors"),
        elevation_roof_m=float(row["elevation_roof_m"]) if row.get("elevation_roof_m") is not None else None,
        elevation_ground_m=float(row["elevation_ground_m"]) if row.get("elevation_ground_m") is not None else None,
    )
    
@router.patch("/{canonical_uid}/resolve", response_model=ResolveResponse)
def resolve_entity(canonical_uid: str, body: ResolveRequest):
    """Marks an entity as reviewed — clears needs_review and records the
    human decision. This is what the review-queue UI should call when
    someone clicks Approve/Reject/Edit on a flagged entity."""
    if body.status not in ("approved", "rejected", "edited"):
        raise HTTPException(status_code=400, detail="status must be approved, rejected, or edited")

    query = """
        UPDATE canonical_entities
        SET needs_review = FALSE,
            resolved_status = %(status)s,
            reviewer_note = %(note)s,
            reviewed_at = %(ts)s
        WHERE canonical_uid = %(canonical_uid)s
        RETURNING canonical_uid
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {
                "status": body.status,
                "note": body.note,
                "ts": datetime.now(timezone.utc),
                "canonical_uid": canonical_uid,
            })
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No entity with canonical_uid={canonical_uid}")

    return ResolveResponse(canonical_uid=row["canonical_uid"], resolved_status=body.status)