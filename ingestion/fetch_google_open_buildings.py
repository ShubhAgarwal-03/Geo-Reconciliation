"""
ingestion/fetch_google_open_buildings.py

Fetches Google Open Buildings polygons for the full district bbox.

Requires (one-time setup, before the demo):
    1. A Google Earth Engine account: https://earthengine.google.com
    2. `earthengine authenticate` run once
    3. EE_PROJECT set in config.py

Usage:
    python -m ingestion.fetch_google_open_buildings
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

import ee
import geemap
import geopandas as gpd
import pandas as pd

from config import DISTRICT_BBOX, EE_PROJECT, CRS_LATLON, CRS_PROJECTED, SCRATCH_DIR

# ee.data.computeValue / getInfo() hard-caps any single collection query at
# 5000 elements server-side — this has nothing to do with bbox size in km^2,
# only feature *count*. Dense urban areas (like our Koramangala/HSR/
# Indiranagar test patch) can cross this well before the bbox looks "big".
# Fixed at district scale too: this is exactly why the architecture always
# planned to tile district imagery — we're just tiling this fetch step too,
# recursively, instead of guessing a fixed grid size upfront.
_MAX_ELEMENTS_ERROR_SNIPPET = "accumulating over 5000 elements"


def _fetch_single_tile(min_lon: float, min_lat: float, max_lon: float, max_lat: float, depth: int = 0) -> gpd.GeoDataFrame:
    """Fetch one small bbox tile; cache to disk; split into 4 if it hits 5000 elements."""
    tmp_path = SCRATCH_DIR / f"_gob_tile_{min_lon:.5f}_{min_lat:.5f}_{max_lon:.5f}_{max_lat:.5f}.geojson"
    if tmp_path.exists() and tmp_path.stat().st_size > 100:
        try:
            return gpd.read_file(str(tmp_path))
        except Exception:
            pass

    region = ee.Geometry.BBox(min_lon, min_lat, max_lon, max_lat)
    buildings_fc = ee.FeatureCollection(
        "GOOGLE/Research/open-buildings/v3/polygons"
    ).filterBounds(region)

    try:
        geemap.ee_to_geojson(buildings_fc, filename=str(tmp_path))
    except Exception as e:
        if _MAX_ELEMENTS_ERROR_SNIPPET in str(e) and depth < 3:
            mid_lon = (min_lon + max_lon) / 2
            mid_lat = (min_lat + max_lat) / 2
            subs = [
                (min_lon, min_lat, mid_lon, mid_lat),
                (mid_lon, min_lat, max_lon, mid_lat),
                (min_lon, mid_lat, mid_lon, max_lat),
                (mid_lon, mid_lat, max_lon, max_lat),
            ]
            sub_gdfs = [_fetch_single_tile(*sub, depth=depth + 1) for sub in subs]
            sub_gdfs = [g for g in sub_gdfs if not g.empty]
            return pd.concat(sub_gdfs, ignore_index=True) if sub_gdfs else gpd.GeoDataFrame()
        raise

    if tmp_path.exists() and tmp_path.stat().st_size > 100:
        return gpd.read_file(str(tmp_path))
    return gpd.GeoDataFrame()


def fetch_google_open_buildings(
    bbox: tuple[float, float, float, float] = DISTRICT_BBOX,
    project: str = EE_PROJECT,
    tile_size_deg: float = 0.01,
    max_workers: int = 8,
) -> gpd.GeoDataFrame:
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from tqdm import tqdm

    ee.Initialize(project=project)

    min_lon, min_lat, max_lon, max_lat = bbox
    print(f"[GOB] Querying Google Open Buildings for district bbox: {bbox}")

    # Generate regular 0.01-degree grid tiles to keep each request well under 5000 buildings
    import numpy as np
    lons = np.arange(min_lon, max_lon, tile_size_deg)
    lats = np.arange(min_lat, max_lat, tile_size_deg)

    tile_coords = []
    for x in lons:
        x2 = min(x + tile_size_deg, max_lon)
        for y in lats:
            y2 = min(y + tile_size_deg, max_lat)
            tile_coords.append((float(x), float(y), float(x2), float(y2)))

    print(f"[GOB] Fetching {len(tile_coords)} tiles in parallel using {max_workers} threads...")

    gdfs = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch_single_tile, *tc): tc for tc in tile_coords}
        with tqdm(total=len(futures), desc="[GOB] Downloading tiles", unit="tile") as pbar:
            for future in as_completed(futures):
                try:
                    res = future.result()
                    if not res.empty:
                        gdfs.append(res)
                except Exception as exc:
                    tc = futures[future]
                    print(f"\n[GOB] Tile {tc} generated an exception: {exc}")
                pbar.update(1)

    if not gdfs:
        raise RuntimeError(
            "No Google Open Buildings found for this district bbox — check "
            "coverage or EE authentication."
        )

    print("[GOB] Concatenating and cleaning fetched footprints...")
    gdf = pd.concat(gdfs, ignore_index=True)
    gdf = gpd.GeoDataFrame(gdf, geometry="geometry")
    gdf = gdf.set_crs(CRS_LATLON) if gdf.crs is None else gdf.to_crs(CRS_LATLON)

    # Tiles can share buildings that sit on a shared boundary (filterBounds
    # matches anything touching the tile, so a border building can come back
    # from more than one tile) — dedupe on exact geometry before proceeding.
    before = len(gdf)
    gdf["_geom_wkt"] = gdf.geometry.apply(lambda g: g.wkt)
    gdf = gdf.drop_duplicates(subset="_geom_wkt").drop(columns="_geom_wkt")
    gdf = gdf.reset_index(drop=True)
    if before != len(gdf):
        print(f"[GOB] Deduplicated {before - len(gdf)} boundary-duplicate buildings")

    area_m2 = gdf.to_crs(CRS_PROJECTED).geometry.area

    gdf["source"] = "google_open_buildings"
    gdf["entity_uid"] = "gob:" + gdf.index.astype(str)
    gdf["feature_type"] = "building"
    gdf["building_type"] = "unknown"
    gdf["area_m2"] = area_m2
    # Google Open Buildings ships its own per-polygon confidence — this is
    # exactly the "AI extraction confidence" signal confidence_score.py
    # looks for, so keep the column name aligned with that expectation.
    if "confidence" in gdf.columns:
        gdf["extraction_confidence"] = gdf["confidence"]
    else:
        gdf["extraction_confidence"] = None

    keep = ["entity_uid", "source", "feature_type", "building_type",
            "area_m2", "extraction_confidence", "geometry"]
    gdf = gdf[[c for c in keep if c in gdf.columns]]

    print(f"[GOB] Fetched {len(gdf)} buildings")
    return gdf


if __name__ == "__main__":
    result = fetch_google_open_buildings()
    print(result.head())
    print(f"Total area: {result['area_m2'].sum():,.0f} m^2")