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