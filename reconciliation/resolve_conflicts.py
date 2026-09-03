"""
resolve_conflicts.py

Takes the Clusters produced by matching/match_entities.py (N-source,
union-find based) and turns each into one reconciled entity per
real-world building.

Two things this version fixes relative to an earlier draft:
  1. Geometry is a real UNION merge of every member polygon by default,
     not "pick whichever source's polygon looked more trustworthy and
     discard the other" — a system whose whole pitch is reconciling
     disagreeing sources shouldn't just throw one source's shape away.
  2. Disagreement is measured via the SAME IoU metric already used by
     matching/similarity.py (1 - average IoU across the cluster's match
     edges), not a separate area-percentage metric — two footprints with
     identical area but offset by several meters actually disagree, and
     an area-only metric would miss that entirely.

This module does NOT decide confidence or review-queue routing — that's
confidence_score.py, which consumes ReconciledEntity objects.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Literal, Optional

from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union

from matching.match_entities import Cluster

logger = logging.getLogger(__name__)

# How to derive the single canonical geometry for a multi-member cluster.
#   "union"        -> geometric union of every member's footprint (default —
#                      keeps all sources' shape information, nothing discarded)
#   "intersection"  -> conservative footprint, only where every member agrees
GeometryStrategy = Literal["union", "intersection"]


@dataclass
class ReconciledEntity:
    entity_id: str
    geom: BaseGeometry
    member_feature_ids: list[int]
    sources: list[str]
    source_count: int
    avg_match_score: Optional[float]     # None for singleton (unmatched) entities
    avg_iou_agreement: Optional[float]   # None for singleton entities; 1 - this = disagreement
    duplicate_source_warning: bool
    attrs: dict = field(default_factory=dict)


def _reconciled_geometry(geoms: list[BaseGeometry], strategy: GeometryStrategy) -> BaseGeometry:
    valid_geoms = [g if g.is_valid else g.buffer(0) for g in geoms if g is not None and not g.is_empty]
    if not valid_geoms:
        raise ValueError("no valid geometries to reconcile in this cluster")
    if len(valid_geoms) == 1:
        return valid_geoms[0]

    if strategy == "union":
        return unary_union(valid_geoms)
    if strategy == "intersection":
        result = valid_geoms[0]
        for g in valid_geoms[1:]:
            result = result.intersection(g)
        return result if not result.is_empty else unary_union(valid_geoms)  # fallback if intersection collapses
    raise ValueError(f"unknown geometry strategy: {strategy}")


def _merge_attrs(features: list[dict]) -> dict:
    """Best-available attribute merge across all cluster members: prefer
    non-null/non-'unknown' values, first source to supply a real value wins."""
    merged: dict = {}
    for f in features:
        for key in ("building_type", "extraction_confidence"):
            value = f.get(key)
            if key not in merged or merged[key] in (None, "unknown", ""):
                if value not in (None, "unknown", ""):
                    merged[key] = value
                elif key not in merged:
                    merged[key] = value
    return merged


def reconcile_cluster(
    cluster: Cluster,
    features_by_id: dict[int, dict],
    geometry_strategy: GeometryStrategy = "union",
) -> ReconciledEntity:
    members = [features_by_id[fid] for fid in cluster.member_feature_ids]
    geoms = [m["geometry"] for m in members]
    sources = sorted({m["source"] for m in members})

    reconciled_geom = _reconciled_geometry(geoms, geometry_strategy)

    if cluster.edges:
        avg_match_score = sum(e.score.total for e in cluster.edges) / len(cluster.edges)
        avg_iou_agreement = sum(e.score.iou for e in cluster.edges) / len(cluster.edges)
    else:
        avg_match_score = None
        avg_iou_agreement = None

    return ReconciledEntity(
        entity_id=str(uuid.uuid4()),
        geom=reconciled_geom,
        member_feature_ids=cluster.member_feature_ids,
        sources=sources,
        source_count=len(sources),
        avg_match_score=avg_match_score,
        avg_iou_agreement=avg_iou_agreement,
        duplicate_source_warning=cluster.duplicate_source_warning,
        attrs=_merge_attrs(members),
    )


def reconcile_clusters(
    clusters: list[Cluster],
    features_by_id: dict[int, dict],
    geometry_strategy: GeometryStrategy = "union",
) -> list[ReconciledEntity]:
    reconciled = [reconcile_cluster(c, features_by_id, geometry_strategy) for c in clusters]
    matched = sum(1 for r in reconciled if r.source_count > 1)
    logger.info("reconciled %d clusters (%d multi-source, %d single-source)",
                len(reconciled), matched, len(reconciled) - matched)
    return reconciled