"""
backend/routers/stats.py

GET /stats — dataset-wide numbers for the dashboard / reports / before-after.
One cheap aggregate pass, cached for a few seconds so a busy dashboard
doesn't hammer a small (shared-CPU) database.
"""
import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from fastapi import APIRouter

from backend.db import get_connection

router = APIRouter(prefix="/stats", tags=["stats"])

_TTL_SECONDS = 15
_cache: dict = {"t": 0.0, "v": None}


def invalidate() -> None:
    """Call after anything that changes the numbers (e.g. a review decision)."""
    _cache["v"] = None


@router.get("")
def get_stats():
    now = time.time()
    if _cache["v"] is not None and now - _cache["t"] < _TTL_SECONDS:
        return _cache["v"]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                  count(*)                                              AS total,
                  count(*) FILTER (WHERE source_count > 1)              AS multi,
                  count(*) FILTER (WHERE source_count = 1)              AS single,
                  count(*) FILTER (WHERE needs_review)                  AS review,
                  count(*) FILTER (WHERE resolved_status IS NOT NULL)   AS resolved,
                  avg(confidence_score)                                 AS avg_conf,
                  avg(avg_iou_agreement)                                AS avg_iou,
                  count(*) FILTER (WHERE confidence_score >= 0.9)       AS hi,
                  count(*) FILTER (WHERE confidence_score >= 0.7 AND confidence_score < 0.9) AS med,
                  count(*) FILTER (WHERE confidence_score < 0.7)        AS lo
                FROM canonical_entities
            """)
            c = cur.fetchone()

            cur.execute("SELECT source, count(*) AS n FROM raw_features GROUP BY source ORDER BY n DESC")
            raw = {r["source"]: r["n"] for r in cur.fetchall()}

            cur.execute("""
                SELECT sources, count(*) AS n FROM canonical_entities
                GROUP BY sources ORDER BY n DESC LIMIT 8
            """)
            combos = [{"sources": r["sources"], "count": r["n"]} for r in cur.fetchall()]

            # to_jsonb(pr)->>'error' keeps this working before/after the
            # optional `error` column migration is applied.
            cur.execute("""
                SELECT id, run_started_at, run_completed_at, raw_feature_count,
                       canonical_entity_count, review_queue_count,
                       to_jsonb(pr)->>'error' AS error
                FROM pipeline_runs pr ORDER BY id DESC LIMIT 1
            """)
            r = cur.fetchone()

    result = {
        # --- legacy key names, kept so any older frontend build keeps working ---
        "matched_entities": c["multi"],
        "needs_review_count": c["review"],
        "sources_distribution": raw,
        "latest_run": None if r is None else {
            "id": r["id"],
            "run_started_at": r["run_started_at"].isoformat() if r["run_started_at"] else None,
            "run_completed_at": r["run_completed_at"].isoformat() if r["run_completed_at"] else None,
            "raw_feature_count": r["raw_feature_count"],
            "canonical_entity_count": r["canonical_entity_count"],
            "review_queue_count": r["review_queue_count"],
        },
        # --- current schema ---
        "total_entities": c["total"],
        "multi_source_entities": c["multi"],
        "single_source_entities": c["single"],
        "needs_review": c["review"],
        "resolved_by_reviewers": c["resolved"],
        "avg_confidence": float(c["avg_conf"]) if c["avg_conf"] is not None else None,
        "avg_iou_agreement": float(c["avg_iou"]) if c["avg_iou"] is not None else None,
        "confidence_buckets": {"high": c["hi"], "medium": c["med"], "low": c["lo"]},
        "raw_features_by_source": raw,
        "entities_by_source_combo": combos,
        "last_run": None if r is None else {
            "id": r["id"],
            "started_at": r["run_started_at"].isoformat() if r["run_started_at"] else None,
            "completed_at": r["run_completed_at"].isoformat() if r["run_completed_at"] else None,
            "raw_feature_count": r["raw_feature_count"],
            "canonical_entity_count": r["canonical_entity_count"],
            "review_queue_count": r["review_queue_count"],
            "error": r["error"],
        },
    }
    _cache["v"], _cache["t"] = result, now
    return result