import {
  CanonicalEntity,
  RawSourceFeature,
  ClusteredCell,
  BackendStats,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export const api = {
  async getHealth(): Promise<{ status: string; postgis_version?: any; detail?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return await res.json();
    } catch (e: any) {
      return { status: 'offline', detail: e.message || 'API unreachable' };
    }
  },

  async getEntities(bbox: BoundingBox, limit = 5000): Promise<CanonicalEntity[]> {
    const params = new URLSearchParams({
      min_lon: bbox.minLon.toFixed(6),
      min_lat: bbox.minLat.toFixed(6),
      max_lon: bbox.maxLon.toFixed(6),
      max_lat: bbox.maxLat.toFixed(6),
      limit: limit.toString(),
    });

    const res = await fetch(`${API_BASE_URL}/entities?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch entities: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  },

  async getClustered(bbox: BoundingBox, gridSizeM = 100): Promise<ClusteredCell[]> {
    const params = new URLSearchParams({
      min_lon: bbox.minLon.toFixed(6),
      min_lat: bbox.minLat.toFixed(6),
      max_lon: bbox.maxLon.toFixed(6),
      max_lat: bbox.maxLat.toFixed(6),
      grid_size_m: gridSizeM.toString(),
    });

    const res = await fetch(`${API_BASE_URL}/entities/clustered?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch clustered entities: ${res.status}`);
    }
    return await res.json();
  },

  async getEntityDetail(canonicalUid: string): Promise<CanonicalEntity> {
    const cleanId = (canonicalUid || '').normalize('NFKD').trim();
    const res = await fetch(`${API_BASE_URL}/entities/${encodeURIComponent(cleanId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch entity details for ${canonicalUid}`);
    }
    return await res.json();
  },

  async searchEntities(query: string, limit = 10): Promise<CanonicalEntity[]> {
    const cleanQuery = (query || '').normalize('NFKD').trim();
    if (!cleanQuery) return [];
    const params = new URLSearchParams({ q: cleanQuery, limit: limit.toString() });
    const res = await fetch(`${API_BASE_URL}/entities/search?${params}`);
    if (!res.ok) {
      throw new Error(`Search failed: ${res.status}`);
    }
    return await res.json();
  },

  async getEntitySources(canonicalUid: string): Promise<RawSourceFeature[]> {
    const res = await fetch(`${API_BASE_URL}/entities/${encodeURIComponent(canonicalUid)}/sources`);
    if (!res.ok) {
      throw new Error(`Failed to fetch source features for ${canonicalUid}`);
    }
    return await res.json();
  },

  async getReviewQueue(bbox?: BoundingBox, limit = 500): Promise<CanonicalEntity[]> {
    const params = new URLSearchParams();
    if (bbox) {
      params.append('min_lon', bbox.minLon.toFixed(6));
      params.append('min_lat', bbox.minLat.toFixed(6));
      params.append('max_lon', bbox.maxLon.toFixed(6));
      params.append('max_lat', bbox.maxLat.toFixed(6));
    }
    params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE_URL}/review-queue?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch review queue: ${res.status}`);
    }
    return await res.json();
  },

  async resolveReview(canonicalUid: string): Promise<{ status: string; canonical_uid: string }> {
    const res = await fetch(`${API_BASE_URL}/review-queue/${encodeURIComponent(canonicalUid)}/resolve`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to resolve review for ${canonicalUid}`);
    }
    return await res.json();
  },

  async getStats(): Promise<BackendStats> {
    const res = await fetch(`${API_BASE_URL}/stats`);
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: ${res.status}`);
    }
    return await res.json();
  },
};
