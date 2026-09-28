/** Real source names as stored in raw_features.source → display label + colour. */
const LABELS: Record<string, string> = {
  osm: 'OpenStreetMap',
  google_open_buildings: 'Google Open Buildings',
  user_upload: 'Uploaded file',
  ai_extracted: 'AI extraction',
};
const COLORS: Record<string, string> = {
  osm: '#4A6D7C',
  google_open_buildings: '#D9A05B',
  user_upload: '#7D6D8A',
  ai_extracted: '#3A5A40',
};
export const sourceLabel = (s: string) => LABELS[s] ?? s;
export const sourceColor = (s: string) => COLORS[s] ?? '#5E6660';
export const shortId = (id: string) => id.slice(0, 8);
export const fmtArea = (a: number | null | undefined) => (a == null ? '—' : `${Math.round(a).toLocaleString()} m²`);
export const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);
