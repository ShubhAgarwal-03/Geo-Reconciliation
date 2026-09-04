"""
backend/schemas.py

Response models. Field names/types match db/schema.sql's canonical_entities
columns exactly — check schema.sql if you're adding a field, don't guess
at what's available.
"""

from typing import Any, Optional

from pydantic import BaseModel


class EntitySummary(BaseModel):
    """Full-detail entity — used by GET /entities (zoomed-in view)."""
    canonical_uid: str
    geometry: dict[str, Any]  # GeoJSON geometry, already reprojected to EPSG:4326
    area_m2: Optional[float]
    source_count: int
    sources: list[str]
    confidence_score: float
    needs_review: bool


class EntityDetail(EntitySummary):
    """Adds the score breakdown — used by GET /entities/{id}."""
    member_feature_ids: list[int]
    avg_match_score: Optional[float]   # None if this entity was never matched (single source)
    avg_iou_agreement: Optional[float]  # None for the same reason
    tile_id: Optional[str]


class ClusteredCell(BaseModel):
    """One grid cell — used by GET /entities/clustered (zoomed-out view)."""
    lon: float
    lat: float
    count: int
    avg_confidence: float
    
class ResolveRequest(BaseModel):
    status: str  # "approved" | "rejected" | "edited"
    note: str | None = None

class ResolveResponse(BaseModel):
    canonical_uid: str
    resolved_status: str

class UploadResponse(BaseModel):
    filename: str
    stored_path: str
    status: str
    
class ReconcileRequest(BaseModel):
    bbox: list[float] | None = None          # NOTE: currently cosmetic — see caveat below          # [min_lon, min_lat, max_lon, max_lat]
    uploaded_file_path: str | None = None

class ReconcileResponse(BaseModel):
    run_id: int
    status: str
    raw_feature_count: Optional[int] = None
    canonical_entity_count: Optional[int] = None
    review_queue_count: Optional[int] = None