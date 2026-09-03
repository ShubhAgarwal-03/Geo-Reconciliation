/**
 * src/hooks/useLiveBuildings.ts
 *
 * Loads buildings from the real Geo-Reconciliation API. Falls back to the
 * existing mock data (src/data/mockBuildings.ts) if the API is unreachable
 * or returns nothing — so the demo never breaks if the backend/DB isn't
 * running, but shows real data the moment it is.
 */

import { useEffect, useState } from 'react';
import { BuildingEntity } from '../types';
import { generateGridBuildings } from '../data/mockBuildings';
import { fetchEntities, fetchReviewQueue, BBox } from '../api/geoReconciliationClient';
import { adaptEntitySummary } from '../api/adapter';

// Matches config.DISTRICT_BBOX in the backend repo (Koramangala + HSR +
// Indiranagar demo district). Update this if that changes.
export const DEFAULT_BBOX: BBox = {
  minLon: 77.58,
  minLat: 12.9,
  maxLon: 77.66,
  maxLat: 12.99,
};

export type DataSource = 'live' | 'mock';

interface UseLiveBuildingsResult {
  buildings: BuildingEntity[];
  source: DataSource;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLiveBuildings(bbox: BBox = DEFAULT_BBOX): UseLiveBuildingsResult {
  const [buildings, setBuildings] = useState<BuildingEntity[]>([]);
  const [source, setSource] = useState<DataSource>('mock');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const entities = await fetchEntities(bbox);
        if (cancelled) return;

        if (entities.length === 0) {
          // API reachable but no data ingested yet — fall back to mock so
          // the UI still demos, but flag it via `source`.
          setBuildings(generateGridBuildings());
          setSource('mock');
        } else {
          setBuildings(entities.map(adaptEntitySummary));
          setSource('live');
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('Geo-Reconciliation API unreachable, using mock data:', e);
        setBuildings(generateGridBuildings());
        setSource('mock');
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, refetchTick]);

  return {
    buildings,
    source,
    loading,
    error,
    refetch: () => setRefetchTick((t) => t + 1),
  };
}

/** Same idea, scoped to the review queue endpoint — use this in
 *  ReviewQueueView if you want it to reflect the live `needs_review` set
 *  rather than filtering the already-loaded `buildings` array client-side. */
export async function loadReviewQueue(bbox?: BBox): Promise<BuildingEntity[]> {
  const entities = await fetchReviewQueue(bbox);
  return entities.map(adaptEntitySummary);
}
