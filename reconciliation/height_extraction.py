"""
reconciliation/height_extraction.py

Samples genuine Copernicus GLO-30 DSM, FABDEM DTM, and nDSM rasters
for all canonical building entities in Supabase PostGIS.

Populates:
- elevation_roof_m: Rooftop elevation above mean sea level (MSL) from Copernicus GLO-30
- elevation_ground_m: Bare-earth ground elevation above MSL from FABDEM
- height_m: True physical building height (nDSM = DSM - DTM)
- estimated_floors: Inferred floor count based on physical height (height / 3.0m)
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import numpy as np
import rasterio
from tqdm import tqdm
from db.connection import get_connection
from config import ROOT_DIR

RASTERS_DIR = ROOT_DIR / "data" / "rasters"
DSM_PATH = RASTERS_DIR / "bangalore_copernicus_dsm.tif"
DTM_PATH = RASTERS_DIR / "bangalore_fabdem_dtm.tif"
NDSM_PATH = RASTERS_DIR / "bangalore_ndsm_heights.tif"

BATCH_SIZE = 5000


def run():
    if not (DSM_PATH.exists() and DTM_PATH.exists() and NDSM_PATH.exists()):
        raise FileNotFoundError("Elevation rasters missing. Please run ingestion/fetch_dsm_dtm.py first.")

    print(f"[elevation-reconcile] Opening elevation rasters from {RASTERS_DIR}...")
    with rasterio.open(DSM_PATH) as dsm_src, \
         rasterio.open(DTM_PATH) as dtm_src, \
         rasterio.open(NDSM_PATH) as ndsm_src:

        dsm_data = dsm_src.read(1)
        dtm_data = dtm_src.read(1)
        ndsm_data = ndsm_src.read(1)

        transform = dsm_src.transform
        inv_transform = ~transform
        n_rows, n_cols = dsm_data.shape

        print(f"[elevation-reconcile] Raster grid: {n_rows}x{n_cols}, CRS: {dsm_src.crs}")

        # Fetch canonical entity centroids from PostGIS
        print("[elevation-reconcile] Fetching canonical entities from Supabase PostGIS...")
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT canonical_uid, 
                           ST_X(ST_Centroid(ST_Transform(geom, 4326))) AS lon,
                           ST_Y(ST_Centroid(ST_Transform(geom, 4326))) AS lat
                    FROM canonical_entities;
                """)
                rows = cur.fetchall()

        total = len(rows)
        print(f"[elevation-reconcile] Loaded {total:,} entities. Computing 3D building heights...")

        uids = [r["canonical_uid"] for r in rows]
        lons = np.array([r["lon"] for r in rows], dtype=np.float64)
        lats = np.array([r["lat"] for r in rows], dtype=np.float64)

        # Convert geographic coordinates (lon, lat) to raster pixel indices (col, row)
        cols, rows_px = inv_transform * (lons, lats)
        cols = np.round(cols).astype(int)
        rows_px = np.round(rows_px).astype(int)

        # Mask points falling within raster bounds
        valid_mask = (cols >= 0) & (cols < n_cols) & (rows_px >= 0) & (rows_px < n_rows)
        valid_count = int(np.sum(valid_mask))
        print(f"[elevation-reconcile] {valid_count:,} of {total:,} entities fall within the district elevation bbox.")

        roof_elevs = np.zeros(total, dtype=np.float32)
        ground_elevs = np.zeros(total, dtype=np.float32)
        heights = np.zeros(total, dtype=np.float32)
        floors = [None] * total

        # Extract values for valid coordinates
        valid_rows = rows_px[valid_mask]
        valid_cols = cols[valid_mask]

        sample_roof = dsm_data[valid_rows, valid_cols]
        sample_ground = dtm_data[valid_rows, valid_cols]
        sample_height = ndsm_data[valid_rows, valid_cols]

        roof_elevs[valid_mask] = sample_roof
        ground_elevs[valid_mask] = sample_ground
        heights[valid_mask] = sample_height

        # For valid entities, infer floor count
        for i in np.where(valid_mask)[0]:
            h = float(heights[i])
            # Minimum 1 floor if height >= 2.5m, otherwise 1 if detected structure
            if h >= 2.5:
                floors[i] = max(1, round(h / 3.0))
            elif h > 0.5:
                floors[i] = 1
            else:
                floors[i] = None

        # Prepare update batches
        print("[elevation-reconcile] Writing 3D elevation & floor attributes to Supabase PostGIS...")
        update_data = []
        for i in range(total):
            if valid_mask[i]:
                update_data.append((
                    round(float(heights[i]), 2),
                    floors[i],
                    round(float(roof_elevs[i]), 2),
                    round(float(ground_elevs[i]), 2),
                    uids[i]
                ))
            else:
                # Outside raster boundary
                update_data.append((None, None, None, None, uids[i]))

        with get_connection() as conn:
            with conn.cursor() as cur:
                for start_idx in tqdm(range(0, len(update_data), BATCH_SIZE), desc="Updating PostGIS"):
                    batch = update_data[start_idx:start_idx + BATCH_SIZE]
                    cur.executemany("""
                        UPDATE canonical_entities
                        SET height_m = %s,
                            estimated_floors = %s,
                            elevation_roof_m = %s,
                            elevation_ground_m = %s
                        WHERE canonical_uid = %s;
                    """, batch)
            conn.commit()

        print(f"[elevation-reconcile] Successfully updated all {total:,} canonical entities with genuine Copernicus/FABDEM elevation attributes!")


if __name__ == "__main__":
    run()
