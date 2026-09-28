/**
 * src/api/adapter.ts
 *
 * Maps backend responses onto the UI types. Nothing here invents data:
 * a field the backend doesn't provide is null / empty, and the UI shows
 * "—" or hides the element.
 */
import {
  ApiEntitySummary, ApiEntityDetail, ApiGeoJsonGeometry, ApiMember, ApiStats,
} from './geoReconciliationClient';
import { BuildingEntity, DatasetStats, HistoryEntry, MemberFeature } from '../types';
import { sourceLabel } from '../data/sources';

/** GeoJSON is [lon, lat]; Leaflet / this app use [lat, lon]. */
export function geoJsonToLatLngRing(geometry: ApiGeoJsonGeometry): [number, number][] {
  let ring: [number, number][] | undefined;
  if (geometry.type === 'Polygon') ring = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') ring = geometry.coordinates[0]?.[0];
  if (!ring) return [];
  return ring.map(([lon, lat]: [number, number]) => [lat, lon]);
}

function centroidOf(coords: [number, number][]): [number, number] {
  if (coords.length === 0) return [0, 0];
  const [a, b] = coords.reduce(([x, y], [lat, lng]) => [x + lat, y + lng], [0, 0]);
  return [a / coords.length, b / coords.length];
}

const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));

export function adaptEntitySummary(e: ApiEntitySummary): BuildingEntity {
  const coordinates = geoJsonToLatLngRing(e.geometry);
  const status: BuildingEntity['status'] =
    e.resolved_status === 'rejected' ? 'conflict' : e.needs_review ? 'review' : 'reconciled';
  return {
    id: e.canonical_uid,
    status,
    confidence: Math.round(e.confidence_score * 100),
    area: e.area_m2,
    sourceNames: e.sources,
    sourcesCount: e.source_count,
    agreementScore: pct(e.avg_iou_agreement),
    matchScore: pct(e.avg_match_score),
    coordinates,
    centroid: centroidOf(coordinates),
    detailLoaded: false,
    tileId: null,
    createdAt: null,
    resolvedStatus: e.resolved_status ?? null,
    reviewerNote: null,
    reviewedAt: null,
    members: null,
  };
}

export function adaptMember(m: ApiMember): MemberFeature {
  return {
    id: m.id,
    source: m.source,
    areaM2: m.area_m2,
    confidence: pct(m.extraction_confidence),
    buildingType: m.building_type && m.building_type !== 'unknown' ? m.building_type : null,
    coordinates: geoJsonToLatLngRing(m.geometry),
  };
}

/** Merge the lazily-loaded detail + members into an entity. */
export function applyDetail(
  base: BuildingEntity, detail: ApiEntityDetail, members: ApiMember[] | null,
): BuildingEntity {
  const merged = adaptEntitySummary(detail);
  return {
    ...base,
    ...merged,
    coordinates: base.coordinates.length ? base.coordinates : merged.coordinates,
    centroid: base.coordinates.length ? base.centroid : merged.centroid,
    detailLoaded: true,
    tileId: detail.tile_id,
    createdAt: detail.created_at ?? null,
    reviewerNote: detail.reviewer_note ?? null,
    reviewedAt: detail.reviewed_at ?? null,
    members: members ? members.map(adaptMember) : null,
  };
}

export function adaptStats(s: ApiStats): DatasetStats {
  return {
    totalEntities: s.total_entities,
    multiSourceEntities: s.multi_source_entities,
    singleSourceEntities: s.single_source_entities,
    needsReview: s.needs_review,
    resolvedByReviewers: s.resolved_by_reviewers,
    avgConfidence: Math.round((s.avg_confidence ?? 0) * 100),
    avgIouAgreement: pct(s.avg_iou_agreement),
    confidenceBuckets: s.confidence_buckets,
    rawFeaturesBySource: s.raw_features_by_source,
    entitiesBySourceCombo: s.entities_by_source_combo,
    lastRun: s.last_run && {
      id: s.last_run.id,
      startedAt: s.last_run.started_at,
      completedAt: s.last_run.completed_at,
      rawFeatureCount: s.last_run.raw_feature_count,
      canonicalEntityCount: s.last_run.canonical_entity_count,
      reviewQueueCount: s.last_run.review_queue_count,
      error: s.last_run.error,
    },
  };
}

/** Audit trail built only from timestamps/notes the backend actually stores. */
export function buildHistory(b: BuildingEntity): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  if (b.reviewedAt && b.resolvedStatus) {
    out.push({
      date: new Date(b.reviewedAt).toLocaleString(),
      action: `Reviewer decision: ${b.resolvedStatus}`,
      actor: 'Human reviewer',
      note: b.reviewerNote || 'No note recorded.',
    });
  }
  if (b.createdAt) {
    out.push({
      date: new Date(b.createdAt).toLocaleString(),
      action: 'Canonical entity created by the reconciliation pipeline',
      actor: 'Pipeline',
      note: `Merged ${b.sourcesCount} source${b.sourcesCount === 1 ? '' : 's'}: ${b.sourceNames.map(sourceLabel).join(', ')}.`,
    });
  }
  return out;
}
