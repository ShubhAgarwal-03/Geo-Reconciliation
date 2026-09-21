export type ConfidenceTier = 'high' | 'medium' | 'low';

export type BuildingStatus = 'reconciled' | 'review' | 'conflict';

export type SourceType = 'ori' | 'municipal' | 'cadastral' | 'ai';

export interface SourceData {
  sourceName: string;
  sourceType: SourceType;
  area: number;
  coordinates: [number, number][];
  confidence: number;
  captureDate: string;
  resolutionOrScale: string;
  color: string;
}

export interface VerificationChecks {
  geometryAgreement: boolean;
  sourceAgreement: boolean;
  attributeAgreement: boolean;
  spatialProximity: boolean;
}

export interface ConflictDetails {
  severity: 'high' | 'medium' | 'low';
  title: string;
  simplifiedReason: string;
  technicalReason: string;
  iouScore: number;
  centroidOffsetMeters: number;
  recommendedArea: number;
  recommendedSource: string;
  sourcesDiff: {
    source: string;
    area: number;
    difference: number;
    note: string;
  }[];
}

export interface BuildingEntity {
  id: string;
  surveyNumber: string;
  wardNo: string;
  zone: string;
  status: BuildingStatus;
  confidence: number;
  area: number;
  landUse: 'Residential' | 'Commercial' | 'Institutional' | 'Mixed Use' | 'Industrial' | 'Not classified';
  height: number | null;
  floors: number | null;
  sourcesCount: number;
  agreementScore: number;
  lastUpdated: string;
  coordinates: [number, number][]; // Reconciled polygon [lat, lng]
  beforeCoordinates?: [number, number][]; // Inconsistent source polygon before reconciliation
  centroid: [number, number];
  sources: {
    ori: SourceData;
    municipal: SourceData;
    cadastral: SourceData;
    ai: SourceData;
  };
  verificationChecks: VerificationChecks;
  conflictDetails?: ConflictDetails;
  history: {
    date: string;
    action: string;
    actor: string;
    note: string;
  }[];
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

export interface ReconciliationStats {
  totalBuildings: number;
  matched: number;
  averageConfidence: number;
  requiresReview: number;
  conflictsDetected: number;
  autoResolved: number;
  beforeConflicts: number;
  afterConflicts: number;
  beforeAvgConfidence: number;
  afterAvgConfidence: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number; // real Date.now(), not an invented "X mins ago" string
  type: 'success' | 'warning' | 'verified' | 'info';
  title: string;
}

export type ActiveTab = 'dashboard' | 'map' | 'data' | 'review' | 'reports';

export type Language = 'en' | 'hi';