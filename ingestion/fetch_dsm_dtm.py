"""
ingestion/fetch_dsm_dtm.py

Fetches genuine, real-world elevation datasets for the Bangalore pilot district:
1. Copernicus GLO-30 DSM (European Space Agency, 30m) - Surface rooftops & canopy
2. FABDEM v1.2 DTM (University of Bristol / Fathom, 30m) - Bare-earth ground terrain
3. Computes the Normalized Digital Surface Model (nDSM = Building Heights = DSM - DTM)

Zero mock or synthetic data: all sourced from official space & research repositories.
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import urllib.request
import urllib.parse
import ee
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling

from config import DISTRICT_BBOX, EE_PROJECT, ROOT_DIR

RASTERS_DIR = ROOT_DIR / "data" / "rasters"
RASTERS_DIR.mkdir(parents=True, exist_ok=True)
API_KEY_PATH = Path("C:/Users/alexe/Desktop/SIH-2026/api_key_opentopography.txt")


def fetch_copernicus_dsm(target_path: Path) -> Path:
    """Fetches Copernicus GLO-30 DSM GeoTIFF via OpenTopography API."""
    if target_path.exists() and target_path.stat().st_size > 50000:
        print(f"[elevation] Using cached Copernicus DSM: {target_path}")
        return target_path

    api_key = API_KEY_PATH.read_text().strip()
    min_lon, min_lat, max_lon, max_lat = DISTRICT_BBOX

    params = {
        "demtype": "COP30",
        "south": str(min_lat),
        "north": str(max_lat),
        "west": str(min_lon),
        "east": str(max_lon),
        "outputFormat": "GTiff",
        "API_Key": api_key,
    }
    url = f"https://portal.opentopography.org/API/globaldem?{urllib.parse.urlencode(params)}"
    print(f"[elevation] Requesting Copernicus GLO-30 DSM for BBOX: {DISTRICT_BBOX}...")
    urllib.request.urlretrieve(url, target_path)
    size_mb = target_path.stat().st_size / (1024 * 1024)
    print(f"[elevation] Downloaded Copernicus DSM: {size_mb:.2f} MB to {target_path}")
    return target_path


def fetch_fabdem_dtm(target_path: Path) -> Path:
    """Fetches FABDEM v1.2 DTM GeoTIFF via Google Earth Engine."""
    if target_path.exists() and target_path.stat().st_size > 50000:
        print(f"[elevation] Using cached FABDEM DTM: {target_path}")
        return target_path

    print(f"[elevation] Initializing Earth Engine ({EE_PROJECT}) for FABDEM DTM...")
    ee.Initialize(project=EE_PROJECT)
    min_lon, min_lat, max_lon, max_lat = DISTRICT_BBOX
    region = ee.Geometry.BBox(min_lon, min_lat, max_lon, max_lat)

    fab = (
        ee.ImageCollection("projects/sat-io/open-datasets/FABDEM")
        .select("b1")
        .filterBounds(region)
        .first()
        .clip(region)
    )
    url = fab.getDownloadURL({
        "scale": 30,
        "crs": "EPSG:4326",
        "region": region,
        "format": "GEO_TIFF",
    })
    print(f"[elevation] Downloading FABDEM DTM GeoTIFF from Earth Engine...")
    urllib.request.urlretrieve(url, target_path)
    size_mb = target_path.stat().st_size / (1024 * 1024)
    print(f"[elevation] Downloaded FABDEM DTM: {size_mb:.2f} MB to {target_path}")
    return target_path


def generate_ndsm(dsm_path: Path, dtm_path: Path, ndsm_path: Path) -> Path:
    """Calculates nDSM (Building Heights = DSM - DTM) aligned to DSM grid."""
    print(f"[elevation] Aligning rasters and computing nDSM (Physical Building Heights)...")
    with rasterio.open(dsm_path) as dsm_src, rasterio.open(dtm_path) as dtm_src:
        dsm = dsm_src.read(1)
        dtm = np.empty_like(dsm)

        # Reproject DTM to exactly match DSM grid & resolution
        reproject(
            source=rasterio.band(dtm_src, 1),
            destination=dtm,
            src_transform=dtm_src.transform,
            src_crs=dtm_src.crs,
            dst_transform=dsm_src.transform,
            dst_crs=dsm_src.crs,
            resampling=Resampling.bilinear,
        )

        # nDSM = DSM - DTM (clamp negative artifacts to 0, clamp max to 150m)
        ndsm = np.clip(dsm - dtm, 0.0, 150.0).astype(np.float32)

        meta = dsm_src.meta.copy()
        meta.update(dtype=rasterio.float32, count=1, nodata=-9999.0)

        with rasterio.open(ndsm_path, "w", **meta) as dst:
            dst.write(ndsm, 1)

    size_mb = ndsm_path.stat().st_size / (1024 * 1024)
    print(f"[elevation] Generated nDSM Building Height GeoTIFF: {size_mb:.2f} MB to {ndsm_path}")
    print(f"[elevation] Elevation Stats: DSM [{dsm.min():.1f}m - {dsm.max():.1f}m], DTM [{dtm.min():.1f}m - {dtm.max():.1f}m], Height [{ndsm.min():.1f}m - {ndsm.max():.1f}m]")
    return ndsm_path


def run():
    dsm_file = RASTERS_DIR / "bangalore_copernicus_dsm.tif"
    dtm_file = RASTERS_DIR / "bangalore_fabdem_dtm.tif"
    ndsm_file = RASTERS_DIR / "bangalore_ndsm_heights.tif"

    fetch_copernicus_dsm(dsm_file)
    fetch_fabdem_dtm(dtm_file)
    generate_ndsm(dsm_file, dtm_file, ndsm_file)
    return dsm_file, dtm_file, ndsm_file


if __name__ == "__main__":
    run()
