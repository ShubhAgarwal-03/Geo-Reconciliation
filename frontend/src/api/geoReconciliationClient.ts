/**
 * src/api/geoReconciliationClient.ts
 *
 * Thin client for the Geo-Reconciliation FastAPI backend
 * (github.com/ShubhAgarwal-03/Geo-Reconciliation).
 *
 * Base URL comes from VITE_API_BASE_URL (see .env.example). Defaults to
 * localhost:8000, which is what `uvicorn backend.main:app --reload` binds to.
 */

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types mirroring backend/schema.py exactly. Keep these in sync with that
// file — if a field is added there, add it here too.
// ---------------------------------------------------------------------------

export interface ApiGeoJsonGeometry {
  type: string;
  coordinates: any; // shape depends on `type` (Polygon | MultiPolygon | ...)
}

export interface ApiEntitySummary {
  canonical_uid: string;
  geometry: ApiGeoJsonGeometry;
  area_m2: number | null;
  source_count: number;
  sources: string[];
  confidence_score: number; // 0.0–1.0
  needs_review: boolean;
}

export interface ApiEntityDetail extends ApiEntitySummary {
  member_feature_ids: number[];
  avg_match_score: number | null;
  avg_iou_agreement: number | null;
  tile_id: string | null;
}

export interface ApiClusteredCell {
  lon: number;
  lat: number;
  count: number;
  avg_confidence: number;
}

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

async function apiGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Geo-Reconciliation API ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<{ status: string; postgis_version?: unknown; detail?: string }> {
  return apiGet(`/health`);
}

export async function fetchEntities(bbox: BBox, limit?: number): Promise<ApiEntitySummary[]> {
  return apiGet<ApiEntitySummary[]>(`/entities`, {
    min_lon: bbox.minLon,
    min_lat: bbox.minLat,
    max_lon: bbox.maxLon,
    max_lat: bbox.maxLat,
    limit,
  });
}

export async function fetchClusteredEntities(bbox: BBox, gridSizeMeters = 100): Promise<ApiClusteredCell[]> {
  return apiGet<ApiClusteredCell[]>(`/entities/clustered`, {
    min_lon: bbox.minLon,
    min_lat: bbox.minLat,
    max_lon: bbox.maxLon,
    max_lat: bbox.maxLat,
    grid_size_m: gridSizeMeters,
  });
}

export async function fetchEntityDetail(canonicalUid: string): Promise<ApiEntityDetail> {
  return apiGet<ApiEntityDetail>(`/entities/${encodeURIComponent(canonicalUid)}`);
}

export async function fetchReviewQueue(bbox?: BBox, limit?: number): Promise<ApiEntitySummary[]> {
  return apiGet<ApiEntitySummary[]>(`/review-queue`, {
    min_lon: bbox?.minLon,
    min_lat: bbox?.minLat,
    max_lon: bbox?.maxLon,
    max_lat: bbox?.maxLat,
    limit,
  });
}
