/**
 * Viewport-driven loading of reconciled entities from the API.
 * No mock / OSM fallback: if the API is unreachable the UI says so.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BuildingEntity } from '../types';
import { fetchEntities, fetchReviewQueue, BBox } from '../api/geoReconciliationClient';
import { adaptEntitySummary } from '../api/adapter';

export interface Viewport { bbox: BBox; zoom: number }

/** Below this zoom the viewport is too large to draw individual footprints. */
export const MIN_ENTITY_ZOOM = 15;
export const ENTITY_LIMIT = 2500;

export function useLiveBuildings(viewport: Viewport | null) {
  const [buildings, setBuildings] = useState<BuildingEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const tooZoomedOut = !!viewport && viewport.zoom < MIN_ENTITY_ZOOM;

  useEffect(() => {
    if (!viewport || tooZoomedOut) return;
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const rows = await fetchEntities(viewport.bbox, ENTITY_LIMIT, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setBuildings(rows.map(adaptEntitySummary));
        setTruncated(rows.length >= ENTITY_LIMIT);
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewport?.bbox.minLon, viewport?.bbox.minLat, viewport?.bbox.maxLon, viewport?.bbox.maxLat,
    viewport?.zoom, tick,
  ]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { buildings, setBuildings, loading, error, truncated, tooZoomedOut, refetch };
}

/** The review queue is its own endpoint (lowest confidence first), not a
 *  filter over whatever happens to be on the map. */
export async function loadReviewQueue(limit = 200): Promise<BuildingEntity[]> {
  const rows = await fetchReviewQueue(undefined, limit);
  return rows.map(adaptEntitySummary);
}
