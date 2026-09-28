/** Deployment config. Everything here can be overridden with VITE_* env vars. */
const env = (import.meta as any).env ?? {};

export const DISTRICT_LABEL: string = env.VITE_DISTRICT_LABEL || 'Koramangala · HSR Layout · Indiranagar, Bengaluru';

// Matches config.DISTRICT_BBOX in the backend.
export const DISTRICT_BBOX = {
  minLon: Number(env.VITE_BBOX_MIN_LON ?? 77.58),
  minLat: Number(env.VITE_BBOX_MIN_LAT ?? 12.9),
  maxLon: Number(env.VITE_BBOX_MAX_LON ?? 77.66),
  maxLat: Number(env.VITE_BBOX_MAX_LAT ?? 12.99),
};

export const DEFAULT_CENTER: [number, number] = [
  Number(env.VITE_CENTER_LAT ?? 12.9784),
  Number(env.VITE_CENTER_LNG ?? 77.6408),
];
export const DEFAULT_ZOOM = Number(env.VITE_DEFAULT_ZOOM ?? 17);
