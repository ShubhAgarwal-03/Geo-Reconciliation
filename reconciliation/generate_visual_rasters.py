import os
import json
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
import matplotlib.cm as cm
from PIL import Image

def main():
    raster_dir = r"C:\Users\alexe\Desktop\SIH-repo\Geo-Reconciliation\Geo-Reconciliation\data\rasters"
    output_dir = r"C:\Users\alexe\Desktop\SIH-repo\LandLens\public\rasters"
    os.makedirs(output_dir, exist_ok=True)

    dsm_path = os.path.join(raster_dir, "bangalore_copernicus_dsm.tif")
    dtm_path = os.path.join(raster_dir, "bangalore_fabdem_dtm.tif")
    ndsm_path = os.path.join(raster_dir, "bangalore_ndsm_heights.tif")

    # Reference grid from DSM
    with rasterio.open(dsm_path) as ref_src:
        ref_bounds = ref_src.bounds
        ref_shape = ref_src.shape
        ref_transform = ref_src.transform
        ref_crs = ref_src.crs
        dsm_data = ref_src.read(1)

    bounds_dict = {
        "southWest": [ref_bounds.bottom, ref_bounds.left],
        "northEast": [ref_bounds.top, ref_bounds.right],
        "center": [(ref_bounds.bottom + ref_bounds.top) / 2, (ref_bounds.left + ref_bounds.right) / 2]
    }

    print(f"Raster bounds: {bounds_dict}")

    # Read and reproject DTM to match DSM grid exactly
    with rasterio.open(dtm_path) as dtm_src:
        dtm_data = np.zeros(ref_shape, dtype=np.float32)
        reproject(
            source=rasterio.band(dtm_src, 1),
            destination=dtm_data,
            src_transform=dtm_src.transform,
            src_crs=dtm_src.crs,
            dst_transform=ref_transform,
            dst_crs=ref_crs,
            resampling=Resampling.bilinear
        )

    # Read nDSM
    with rasterio.open(ndsm_path) as ndsm_src:
        ndsm_data = ndsm_src.read(1)

    # 1. Generate DSM RGBA Image (Elevation MSL, e.g. 870m - 950m)
    # Using 'turbo' colormap with smooth transitions
    min_elev = 865.0
    max_elev = 955.0
    dsm_norm = np.clip((dsm_data - min_elev) / (max_elev - min_elev), 0.0, 1.0)
    dsm_rgba = cm.turbo(dsm_norm) # returns RGBA in [0, 1]
    dsm_rgba = (dsm_rgba * 255).astype(np.uint8)
    Image.fromarray(dsm_rgba).save(os.path.join(output_dir, "dsm_copernicus.png"))
    print("Saved dsm_copernicus.png")

    # 2. Generate DTM RGBA Image (Bare-earth Elevation MSL)
    dtm_norm = np.clip((dtm_data - min_elev) / (max_elev - min_elev), 0.0, 1.0)
    dtm_rgba = cm.turbo(dtm_norm)
    dtm_rgba = (dtm_rgba * 255).astype(np.uint8)
    Image.fromarray(dtm_rgba).save(os.path.join(output_dir, "dtm_fabdem.png"))
    print("Saved dtm_fabdem.png")

    # 3. Generate nDSM RGBA Image (Building Heights Heatmap)
    # 0 to 1.5m is made transparent so bare earth shows through to satellite basemap!
    # 1.5m to 20m uses magma or plasma
    min_h = 0.0
    max_h = 22.0
    ndsm_norm = np.clip((ndsm_data - min_h) / (max_h - min_h), 0.0, 1.0)
    ndsm_rgba = cm.plasma(ndsm_norm)
    ndsm_rgba = (ndsm_rgba * 255).astype(np.uint8)
    # Set alpha channel: transparent where height < 1.8m
    mask_ground = ndsm_data < 1.8
    ndsm_rgba[mask_ground, 3] = 0 # full transparency for ground
    ndsm_rgba[~mask_ground, 3] = 230 # high opacity for buildings
    Image.fromarray(ndsm_rgba).save(os.path.join(output_dir, "ndsm_heights.png"))
    print("Saved ndsm_heights.png")

    # Metadata for frontend
    metadata = {
        "bounds": bounds_dict,
        "dsm": {
            "name": "Copernicus GLO-30 DSM",
            "file": "/rasters/dsm_copernicus.png",
            "minElev": min_elev,
            "maxElev": max_elev,
            "unit": "m (MSL)"
        },
        "dtm": {
            "name": "FABDEM v1.2 DTM",
            "file": "/rasters/dtm_fabdem.png",
            "minElev": min_elev,
            "maxElev": max_elev,
            "unit": "m (MSL)"
        },
        "ndsm": {
            "name": "nDSM Structure Heights",
            "file": "/rasters/ndsm_heights.png",
            "minHeight": 0,
            "maxHeight": max_h,
            "unit": "m (Height)"
        }
    }

    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    print("Saved metadata.json")

if __name__ == "__main__":
    main()
