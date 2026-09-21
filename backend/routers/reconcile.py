"""
backend/routers/reconcile.py

POST /reconcile — creates the pipeline_runs row up front (so the API can
hand back a run_id immediately), then kicks off
`python -m pipeline.run_offline_batch --run-id <id> [--uploaded-file <path>]`
in the background. Passing --run-id tells the script to update the row we
already created instead of inserting a second one.

CAVEAT: `bbox` on the request is stored on the pipeline_runs row for
record-keeping, but is NOT currently passed through to fetch_osm_buildings /
fetch_google_open_buildings — those still read config.DISTRICT_BBOX. Wiring
a per-request bbox override through would mean run_offline_batch also
accepting --min-lon/--min-lat/etc. and threading that into both fetch
functions, which I haven't done here since you didn't ask for it yet.
"""

import subprocess
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from fastapi import APIRouter, BackgroundTasks

from backend.db import get_connection
from backend.schema import ReconcileRequest, ReconcileResponse
from fastapi import APIRouter, BackgroundTasks, HTTPException

router = APIRouter(prefix="/reconcile", tags=["reconcile"])
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _run_pipeline(run_id: int, uploaded_file_path: str | None):
    cmd = [sys.executable, "-m", "pipeline.run_offline_batch", "--run-id", str(run_id)]
    if uploaded_file_path:
        cmd += ["--uploaded-file", uploaded_file_path]

    result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[reconcile] pipeline run {run_id} failed:\n{result.stderr}")


@router.post("", response_model=ReconcileResponse)
def trigger_reconcile(body: ReconcileRequest, background_tasks: BackgroundTasks):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO pipeline_runs (bbox) VALUES (%(bbox)s) RETURNING id",
                {"bbox": body.bbox or []},
            )
            run_id = cur.fetchone()["id"]

    background_tasks.add_task(_run_pipeline, run_id, body.uploaded_file_path)
    return ReconcileResponse(run_id=run_id, status="started")


@router.get("/{run_id}", response_model=ReconcileResponse)
def get_reconcile_status(run_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT run_completed_at, raw_feature_count,
                       canonical_entity_count, review_queue_count
                FROM pipeline_runs WHERE id = %(run_id)s
                """,
                {"run_id": run_id},
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No pipeline run with id={run_id}")

    status = "complete" if row["run_completed_at"] else "running"
    return ReconcileResponse(
        run_id=run_id,
        status=status,
        raw_feature_count=row["raw_feature_count"],
        canonical_entity_count=row["canonical_entity_count"],
        review_queue_count=row["review_queue_count"],
    )