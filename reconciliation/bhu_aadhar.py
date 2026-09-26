"""
reconciliation/bhu_aadhar.py

Official Bhu-Aadhar (ULPIN - Unique Land Parcel Identification Number) Engine
Compliant with Department of Land Resources (DoLR) & NIC specifications under
the NAKSHA (National Geospatial Knowledge-based Land Survey of Urban Habitations)
and DILRMP programmes.

Specification:
  - Total: 14 alphanumeric characters.
  - Prefix (4 chars):
      * 2 chars: State Census Code (e.g. '29' for Karnataka)
      * 2 chars: District Census Code (e.g. '20' for Bengaluru Urban)
  - PNIU (10 chars):
      * Property Natural Identifier Unit: deterministic sub-meter geohash
        encoding of the parcel centroid coordinates (WGS84 EPSG:4326)
        in compliance with ECCMA / OGC standards.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

sys.path.append(str(Path(__file__).resolve().parent.parent))

from shapely.geometry.base import BaseGeometry
import pyproj
from shapely.ops import transform

from db.connection import get_connection

# Standard Census 2011 Codes for Bangalore Urban, Karnataka
DEFAULT_STATE_CODE = "29"     # Karnataka
DEFAULT_DISTRICT_CODE = "20"  # Bengaluru Urban

# Base-32 alphabet used in standard OGC / ECCMA geocoding
BASE32_ALPHABET = "0123456789BCDFGHJKLMNPQRSTUVWXYZ"

# Projections for coordinate conversion
_wgs84_proj = pyproj.CRS("EPSG:4326")
_utm_proj = pyproj.CRS("EPSG:32643")
_transformer = pyproj.Transformer.from_crs(_utm_proj, _wgs84_proj, always_xy=True)


def encode_pniu(lat: float, lon: float, precision: int = 10) -> str:
    """Encodes (latitude, longitude) into an official 10-character ECCMA / OGC PNIU geohash."""
    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2.0
            if lon > mid:
                ch |= bits[bit]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if lat > mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32_ALPHABET[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def generate_bhu_aadhar(
    geom_utm: BaseGeometry,
    state_code: str = DEFAULT_STATE_CODE,
    district_code: str = DEFAULT_DISTRICT_CODE,
) -> str:
    """Generates the official 14-digit Bhu-Aadhar (ULPIN) for a polygon in UTM Zone 43N."""
    centroid = geom_utm.centroid
    lon, lat = _transformer.transform(centroid.x, centroid.y)
    pniu = encode_pniu(lat, lon, precision=10)
    return f"{state_code}{district_code}{pniu}"


def format_bhu_aadhar(bhu_aadhar: str) -> str:
    """Formats 14-char Bhu-Aadhar for human readability (e.g. '2920-TDR1-WJX1W0')."""
    if len(bhu_aadhar) == 14:
        return f"{bhu_aadhar[:4]}-{bhu_aadhar[4:8]}-{bhu_aadhar[8:]}"
    return bhu_aadhar


def apply_schema_migration() -> None:
    """Ensures bhu_aadhar column and index exist on canonical_entities."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                ALTER TABLE canonical_entities
                ADD COLUMN IF NOT EXISTS bhu_aadhar VARCHAR(14);

                CREATE INDEX IF NOT EXISTS idx_canonical_entities_bhu_aadhar
                ON canonical_entities (bhu_aadhar);
            """)
        conn.commit()
    print("[bhu_aadhar] Schema migration applied: bhu_aadhar column and index ready.")


def populate_all_bhu_aadhar(batch_size: int = 25000) -> None:
    """Computes and populates bhu_aadhar directly inside PostGIS using fast SQL."""
    apply_schema_migration()
    print("[bhu_aadhar] Populating 14-digit Bhu-Aadhar for all canonical entities in Supabase PostGIS...")

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Check how many need populating
            cur.execute("SELECT count(*) as cnt FROM canonical_entities WHERE bhu_aadhar IS NULL;")
            needed = cur.fetchone()["cnt"]
            print(f"[bhu_aadhar] Found {needed} entities requiring Bhu-Aadhar assignment.")

            if needed == 0:
                print("[bhu_aadhar] All canonical entities already have Bhu-Aadhar IDs!")
                return

            # Direct PostGIS ST_GeoHash update - ultra-fast, server-side
            cur.execute(f"""
                UPDATE canonical_entities
                SET bhu_aadhar = '{DEFAULT_STATE_CODE}{DEFAULT_DISTRICT_CODE}' || UPPER(ST_GeoHash(ST_Transform(ST_Centroid(geom), 4326), 10))
                WHERE bhu_aadhar IS NULL;
            """)
        conn.commit()

    print("[bhu_aadhar] Successfully generated and populated Bhu-Aadhar IDs for all canonical entities!")


if __name__ == "__main__":
    populate_all_bhu_aadhar()
