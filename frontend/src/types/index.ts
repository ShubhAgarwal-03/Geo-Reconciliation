export type BuildingStatus = 'reconciled' | 'review' | 'conflict';

/** One raw source polygon that was merged into a canonical entity
 *  (from raw_features via canonical_entities.member_feature_ids). */
export interface MemberFeature {
  id: number;
  source: string;                 // 'osm' | 'google_open_buildings' | 'user_upload' | ...
  areaM2: number | null;
  confidence: number | null;      // 0–100, the source's own confidence (null if it provides none)
  buildingType: string | null;
  coordinates: [number, number][]; // [lat, lng]
}

export interface BuildingEntity {
  id: string;                     // canonical_uid
  status: BuildingStatus;
  confidence: number;             // 0–100
  area: number | null;            // m²
  sourceNames: string[];
  sourcesCount: number;
  agreementScore: number | null;  // avg IoU × 100; null = never cross-validated (single source)
  matchScore: number | null;      // avg match score × 100; null for single source
  coordinates: [number, number][]; // reconciled polygon [lat, lng]
  centroid: [number, number];
  // Loaded lazily when an entity is selected:
  detailLoaded: boolean;
  tileId: string | null;
  createdAt: string | null;
  resolvedStatus: string | null;  // 'approved' | 'rejected' | 'edited' | null
  reviewerNote: string | null;
  reviewedAt: string | null;
  members: MemberFeature[] | null;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: number;             // Date.now()
  storedPath: string;             // path returned by POST /upload
}

export interface DatasetStats {
  totalEntities: number;
  multiSourceEntities: number;
  singleSourceEntities: number;
  needsReview: number;
  resolvedByReviewers: number;
  avgConfidence: number;          // 0–100
  avgIouAgreement: number | null; // 0–100
  confidenceBuckets: { high: number; medium: number; low: number }; // ≥90, 70–89, <70
  rawFeaturesBySource: Record<string, number>;
  entitiesBySourceCombo: { sources: string[]; count: number }[];
  lastRun: {
    id: number;
    startedAt: string;
    completedAt: string | null;
    rawFeatureCount: number | null;
    canonicalEntityCount: number | null;
    reviewQueueCount: number | null;
    error: string | null;
  } | null;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'success' | 'warning' | 'verified' | 'info';
  title: string;
}

export interface HistoryEntry { date: string; action: string; actor: string; note: string }

export type ActiveTab = 'dashboard' | 'map' | 'data' | 'review' | 'reports';
export type Language = 'en' | 'hi';
