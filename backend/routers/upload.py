"""
backend/routers/upload.py

POST /upload — accepts a GeoJSON or zipped-shapefile and stores it under
data/uploads/. This endpoint only receives and stores the file; it does
NOT automatically run ingestion or matching. Decide separately whether a
successful upload should auto-call POST /reconcile or wait for a manual
"Reconcile" action in the UI — wiring that decision in is a one-line
addition here once you pick.
"""

import shutil
import sys
import uuid
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from fastapi import APIRouter, HTTPException, UploadFile, File

from backend.schema import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".geojson", ".json", ".zip"}


@router.post("", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    dest = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return UploadResponse(filename=file.filename, stored_path=str(dest), status="received")