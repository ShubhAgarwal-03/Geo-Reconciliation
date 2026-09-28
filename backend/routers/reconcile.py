"""
backend/routers/reconcile.py

POST /reconcile runs the FULL offline pipeline (osmnx + Earth Engine +
geopandas over the whole district) in a subprocess inside this web service.
That is far heavier than anything else the API does, so:

  * it is OFF unless ENABLE_RECONCILE=true is set in the environment,
  * only one run may be active at a time (409 otherwise),
  * a crashed subprocess marks the run as failed instead of "running" forever,
  * only files inside data/uploads/ are accepted.
"""
import os
import subprocess
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.db import get_connection
from backend.routers import stats as stats_router
from backend.schema import ReconcileRequest, ReconcileResponse

router = APIRouter(prefix="/reconcile", tags=["reconcile"])
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = (PROJECT_ROOT / "data" / "uploads").resolve()


def _enabled() -> bool:
    return os.getenv("ENABLE_RECONCILE", "false").lower() == "true"


def _mark_failed(run_id: int, message: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE pipeline_runs SET error = %s, run_completed_at = now() WHERE id = %s",
                (message[:1000], run_id),
            )
        conn.commit()


def _run_pipeline(run_id: int, uploaded_file_path: str | None):
    cmd = [sys.executable, "-m", "pipeline.run_offline_batch", "--run-id", str(run_id)]
    if uploaded_file_path:
        cmd += ["--uploaded-file", uploaded_file_path]
    try:
        result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=45 * 60)
        if result.returncode != 0:
            tail = (result.stderr or "").strip().splitlines()[-3:]
            _mark_failed(run_id, "Pipeline failed: " + " | ".join(tail))
    except Exception as e:  # timeout, OOM-kill, etc.
        _mark_failed(run_id, f"Pipeline aborted: {e}")
    finally:
        stats_router.invalidate()


@router.post("", response_model=ReconcileResponse)
def trigger_reconcile(body: ReconcileRequest, background_tasks: BackgroundTasks):
    if not _enabled():
        raise HTTPException(
            status_code=503,
            detail="Reconciliation is disabled on this hosted demo (it needs more memory than the free "
                   "instance provides). The included dataset is already reconciled; run the pipeline locally "
                   "for your own data.",
        )

    if body.uploaded_file_path:
        p = Path(body.uploaded_file_path).resolve()
        if UPLOAD_DIR not in p.parents or not p.exists():
            raise HTTPException(status_code=400, detail="uploaded_file_path must be a file from /upload")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""SELECT id FROM pipeline_runs
                           WHERE run_completed_at IS NULL AND run_started_at > now() - interval '60 minutes'
                           LIMIT 1""")
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="A reconciliation run is already in progress.")
            cur.execute("INSERT INTO pipeline_runs (bbox) VALUES (%(bbox)s) RETURNING id", {"bbox": body.bbox or []})
            run_id = cur.fetchone()["id"]
        conn.commit()

    background_tasks.add_task(_run_pipeline, run_id, body.uploaded_file_path)
    return ReconcileResponse(run_id=run_id, status="started")


@router.get("/{run_id}", response_model=ReconcileResponse)
def get_reconcile_status(run_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT run_completed_at, raw_feature_count, canonical_entity_count,
                       review_queue_count, to_jsonb(pr)->>'error' AS error
                FROM pipeline_runs pr WHERE id = %(run_id)s
            """, {"run_id": run_id})
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"No pipeline run with id={run_id}")

    if row["error"]:
        status = "failed"
    elif row["run_completed_at"]:
        status = "complete"
    else:
        status = "running"
    return ReconcileResponse(
        run_id=run_id, status=status, error=row["error"],
        raw_feature_count=row["raw_feature_count"],
        canonical_entity_count=row["canonical_entity_count"],
        review_queue_count=row["review_queue_count"],
    )
