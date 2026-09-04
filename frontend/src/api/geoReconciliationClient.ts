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

export interface ResolveRequestBody {
  status: 'approved' | 'rejected' | 'edited';
  note?: string;
}

export interface ResolveResponse {
  canonical_uid: string;
  resolved_status: string;
}

export async function resolveEntity(
  canonicalUid: string,
  body: ResolveRequestBody
): Promise<ResolveResponse> {
  const url = new URL(`/entities/${encodeURIComponent(canonicalUid)}/resolve`, API_BASE_URL);
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Geo-Reconciliation API ${res.status} on resolve: ${await res.text().catch(() => '')}`);
  return res.json();
}

export interface UploadResponse {
  filename: string;
  stored_path: string;
  status: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const url = new URL('/upload', API_BASE_URL);
  const res = await fetch(url.toString(), { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Geo-Reconciliation API ${res.status} on upload: ${await res.text().catch(() => '')}`);
  return res.json();
}

export interface ReconcileResponse {
  run_id: number;
  status: 'started' | 'running' | 'complete';
  raw_feature_count?: number | null;
  canonical_entity_count?: number | null;
  review_queue_count?: number | null;
}



export async function triggerReconcile(
  uploadedFilePath?: string,
  bbox?: number[]
): Promise<ReconcileResponse> {
  const url = new URL('/reconcile', API_BASE_URL);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bbox: bbox ?? null,
      uploaded_file_path: uploadedFilePath ?? null,
    }),
  });
  if (!res.ok) throw new Error(`Geo-Reconciliation API ${res.status} on reconcile: ${await res.text().catch(() => '')}`);
  return res.json();
}

export async function getReconcileStatus(runId: number): Promise<ReconcileResponse> {
  return apiGet<ReconcileResponse>(`/reconcile/${runId}`);
}