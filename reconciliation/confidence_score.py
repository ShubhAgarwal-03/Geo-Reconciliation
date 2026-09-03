"""
reconciliation/confidence_score.py

confidence = w_match * match_score + w_agreement * inter_source_agreement
           + w_extraction * ai_extraction_confidence

This restores a regression from an earlier draft, which dropped the
matching engine's own score from the confidence formula entirely and
substituted a source-count bonus (more sources agreeing = higher
confidence, regardless of how well they actually matched). That let a
weak three-source match outscore a near-perfect two-source match — the
formula here always includes real match quality (avg_match_score) as the
largest-weighted term, per the original design.

Agreement is derived from avg_iou_agreement (the same geometric IoU
metric used throughout matching/similarity.py), not a separate
area-percentage metric.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from config import (
    CONFIDENCE_WEIGHT_MATCH, CONFIDENCE_WEIGHT_AGREEMENT, CONFIDENCE_WEIGHT_EXTRACTION,
    CONFIDENCE_REVIEW_THRESHOLD, UNMATCHED_MATCH_SCORE_PROXY, UNMATCHED_AGREEMENT,
    NO_EXTRACTION_CONFIDENCE_DEFAULT, MATCH_SRID,
)
from db.connection import get_connection
from reconciliation.resolve_conflicts import ReconciledEntity

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ConfidenceWeights:
    w_match: float = CONFIDENCE_WEIGHT_MATCH
    w_agreement: float = CONFIDENCE_WEIGHT_AGREEMENT
    w_extraction: float = CONFIDENCE_WEIGHT_EXTRACTION

    def __post_init__(self):
        total = self.w_match + self.w_agreement + self.w_extraction
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"ConfidenceWeights must sum to 1.0, got {total}")


DEFAULT_WEIGHTS = ConfidenceWeights()


def _extraction_confidence(entity: ReconciledEntity) -> float:
    value = entity.attrs.get("extraction_confidence")
    return float(value) if value is not None else NO_EXTRACTION_CONFIDENCE_DEFAULT


def compute_confidence(entity: ReconciledEntity, weights: ConfidenceWeights = DEFAULT_WEIGHTS) -> float:
    match_score = entity.avg_match_score if entity.avg_match_score is not None else UNMATCHED_MATCH_SCORE_PROXY
    agreement = entity.avg_iou_agreement if entity.avg_iou_agreement is not None else UNMATCHED_AGREEMENT
    extraction = _extraction_confidence(entity)

    confidence = (
        weights.w_match * match_score
        + weights.w_agreement * agreement
        + weights.w_extraction * extraction
    )
    # A cluster where matching produced a same-source duplicate is a
    # matching anomaly (see match_entities.py) — cap confidence so it
    # always routes to review rather than silently auto-accepting.
    if entity.duplicate_source_warning:
        confidence = min(confidence, CONFIDENCE_REVIEW_THRESHOLD - 0.01)

    return round(min(max(confidence, 0.0), 1.0), 4)


@dataclass
class ScoredEntity:
    entity: ReconciledEntity
    confidence: float
    needs_review: bool


def score_entities(
    entities: list[ReconciledEntity],
    review_threshold: float = CONFIDENCE_REVIEW_THRESHOLD,
    weights: ConfidenceWeights = DEFAULT_WEIGHTS,
) -> list[ScoredEntity]:
    scored = []
    for entity in entities:
        confidence = compute_confidence(entity, weights=weights)
        scored.append(ScoredEntity(entity=entity, confidence=confidence, needs_review=confidence < review_threshold))
    n_review = sum(1 for s in scored if s.needs_review)
    logger.info("scored %d entities, %d routed to review (threshold=%.2f)",
                len(scored), n_review, review_threshold)
    return scored


# ---------------------------------------------------------------------------
# Writing to PostGIS (canonical_entities)
# ---------------------------------------------------------------------------

def write_scored_entities(scored: list[ScoredEntity], tile_id: str | None = None) -> None:
    if not scored:
        logger.info("no scored entities to write")
        return

    rows = [
        (
            s.entity.entity_id,
            s.entity.geom.wkt,
            s.entity.geom.area,
            s.entity.source_count,
            s.entity.sources,
            s.entity.member_feature_ids,
            s.entity.avg_match_score,
            s.entity.avg_iou_agreement,
            s.confidence,
            s.needs_review,
            tile_id,
        )
        for s in scored
    ]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                f"""
                INSERT INTO canonical_entities
                    (canonical_uid, geom, area_m2, source_count, sources,
                     member_feature_ids, avg_match_score, avg_iou_agreement,
                     confidence_score, needs_review, tile_id)
                VALUES (%s, ST_GeomFromText(%s, {MATCH_SRID}), %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (canonical_uid) DO UPDATE SET
                    confidence_score = EXCLUDED.confidence_score,
                    needs_review = EXCLUDED.needs_review
                """,
                rows,
            )
        conn.commit()
    logger.info("wrote %d canonical entities", len(rows))