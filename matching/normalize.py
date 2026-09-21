"""
matching/normalize.py

Validates/cleans a source GeoDataFrame (as produced by ingestion/*.py, in
EPSG:4326) and inserts it into raw_features, reprojected into the matching
SRID (config.MATCH_SRID) — every downstream matching/reconciliation
calculation runs in that projected CRS, never in lat/lon degrees.
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

import geopandas as gpd

from config import CRS_LATLON, CRS_PROJECTED, MATCH_SRID
from db.connection import get_connection

REQUIRED_COLUMNS = ["entity_uid", "source", "feature_type", "building_type", "area_m2", "geometry"]


def normalize_layer(gdf: gpd.GeoDataFrame, source_name: str) -> gpd.GeoDataFrame:
    """Cleans geometry, ensures CRS, recomputes area/centroid in the
    projected CRS, and reprojects the geometry column itself into
    CRS_PROJECTED (so insert_raw_features can write it as-is)."""
    missing = [c for c in REQUIRED_COLUMNS if c not in gdf.columns]
    if missing:
        raise ValueError(f"[{source_name}] Missing required columns: {missing}")

    before = len(gdf)
    gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()].copy()

    invalid_mask = ~gdf.geometry.is_valid
    if invalid_mask.any():
        gdf.loc[invalid_mask, "geometry"] = gdf.loc[invalid_mask, "geometry"].buffer(0)

    after = len(gdf)
    if before != after:
        print(f"[{source_name}] Dropped {before - after} invalid/empty geometries")

    gdf = gdf.set_crs(CRS_LATLON) if gdf.crs is None else gdf.to_crs(CRS_LATLON)

    gdf_proj = gdf.to_crs(CRS_PROJECTED)
    gdf["area_m2"] = gdf_proj.geometry.area
    centroid_proj = gdf_proj.geometry.centroid
    gdf["centroid_x"] = centroid_proj.x
    gdf["centroid_y"] = centroid_proj.y
    gdf["geometry"] = gdf_proj.geometry  # store the PROJECTED geometry — raw_features.geom is SRID 32643

    if "extraction_confidence" not in gdf.columns:
        gdf["extraction_confidence"] = None

    return gdf


def insert_raw_features(gdf: gpd.GeoDataFrame, tile_id: str | None = None) -> None:
    """Bulk-inserts a normalized (projected-CRS) GeoDataFrame into
    raw_features. ON CONFLICT (entity_uid) DO NOTHING makes re-runs safe."""
    if gdf.empty:
        print("[normalize] Nothing to insert — empty GeoDataFrame")
        return

    source = gdf["source"].iloc[0] if len(gdf) else "n/a"
    from tqdm import tqdm

    # Fast column extraction instead of slow row-by-row iterrows()
    wkts = [g.wkt for g in gdf.geometry]
    ext_confs = [
        float(v) if v not in (None, "") and str(v).replace('.', '', 1).isdigit() else None
        for v in gdf.get("extraction_confidence", [None] * len(gdf))
    ]
    building_types = gdf.get("building_type", [None] * len(gdf)).tolist()
    areas = gdf["area_m2"].astype(float).tolist()
    cx = gdf["centroid_x"].astype(float).tolist()
    cy = gdf["centroid_y"].astype(float).tolist()
    uids = gdf["entity_uid"].tolist()
    sources = gdf["source"].tolist()
    ftypes = gdf["feature_type"].tolist()

    rows = list(zip(uids, sources, ftypes, building_types, areas, ext_confs, cx, cy, wkts, [tile_id] * len(gdf)))

    CHUNK_SIZE = 5000
    insert_sql = f"""
        INSERT INTO raw_features
            (entity_uid, source, feature_type, building_type, area_m2,
             extraction_confidence, centroid_x, centroid_y, geom, tile_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s, {MATCH_SRID}), %s)
        ON CONFLICT (entity_uid) DO NOTHING
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            for i in tqdm(range(0, len(rows), CHUNK_SIZE), desc=f"[normalize] Inserting {source} features", unit="chunk"):
                cur.executemany(insert_sql, rows[i:i + CHUNK_SIZE])
                conn.commit()

    print(f"[normalize] Inserted up to {len(rows)} rows into raw_features (source={source})")