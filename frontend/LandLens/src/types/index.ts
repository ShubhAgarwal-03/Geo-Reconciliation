export type ConfidenceTier = 'high' | 'medium' | 'low';
export type BuildingStatus = 'reconciled' | 'review' | 'conflict';

export interface GeoJSONGeometry {
  type: string;
  coordinates: any;
}

export interface CanonicalEntity {
  canonical_uid: string;
  bhu_aadhar?: string | null;
  geometry: GeoJSONGeometry;
  area_m2: number | null;
  source_count: number;
  sources: string[];
  confidence_score: number;
  needs_review: boolean;
  member_feature_ids?: number[];
  avg_match_score?: number | null;
  avg_iou_agreement?: number | null;
  tile_id?: string | null;
  height_m?: number | null;
  estimated_floors?: number | null;
  elevation_roof_m?: number | null;
  elevation_ground_m?: number | null;
}

export interface RawSourceFeature {
  id: number;
  entity_uid?: string | null;
  source: string;
  feature_type: string;
  building_type?: string | null;
  area_m2?: number | null;
  extraction_confidence?: number | null;
  geometry: GeoJSONGeometry;
}

export interface ClusteredCell {
  lon: number;
  lat: number;
  count: number;
  avg_confidence: number;
}

export interface BackendStats {
  total_entities: number;
  matched_entities: number;
  single_source_entities: number;
  needs_review_count: number;
  avg_confidence: number;
  sources_distribution: Record<string, number>;
  latest_run?: {
    id: number;
    bbox: number[];
    run_started_at: string | null;
    run_completed_at: string | null;
    raw_feature_count: number;
    canonical_entity_count: number;
    review_queue_count: number;
  } | null;
}

export interface UploadedFile {
  id: string;
  name: string;
  dataType: string;
  size: string;
  uploadDate: string;
  status: 'processed' | 'processing' | 'ready' | 'flagged';
  crsDetected: string;
  featuresCount: number;
  errorCount: number;
}

export type ActiveTab = 'dashboard' | 'map' | 'data' | 'review' | 'reports';
export type Language = 'en' | 'hi';
