import React from 'react';
import { BuildingEntity } from '../types';
import { sourceColor } from '../data/sources';

/** Renders the REAL member polygons of an entity (one colour per source)
 *  and its reconciled polygon, projected into a shared square viewBox.
 *  `mode`: 'sources' | 'reconciled' | 'both'. No offsets, no jitter. */
export const FootprintOverlay: React.FC<{
  building: BuildingEntity;
  mode: 'sources' | 'reconciled' | 'both';
  visibleSources?: string[] | null; // null = all
  size?: number;
}> = ({ building, mode, visibleSources = null, size = 280 }) => {
  const members = building.members ?? [];
  const all: [number, number][] = [
    ...building.coordinates,
    ...members.flatMap((m) => m.coordinates),
  ];
  if (all.length === 0) return null;

  const lats = all.map((c) => c[0]);
  const lngs = all.map((c) => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  // Equirectangular correction so shapes aren't stretched.
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const w = (maxLng - minLng) * kx || 1e-6;
  const h = (maxLat - minLat) || 1e-6;
  const scale = (size * 0.82) / Math.max(w, h);
  const offX = (size - w * scale) / 2;
  const offY = (size - h * scale) / 2;

  const pts = (coords: [number, number][]) =>
    coords.map(([lat, lng]) =>
      `${(((lng - minLng) * kx) * scale + offX).toFixed(1)},${(size - ((lat - minLat) * scale + offY)).toFixed(1)}`
    ).join(' ');

  const shown = members.filter((m) => !visibleSources || visibleSources.includes(m.source));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {(mode === 'sources' || mode === 'both') && shown.map((m) => (
        <polygon
          key={m.id}
          points={pts(m.coordinates)}
          fill={sourceColor(m.source)}
          fillOpacity={0.14}
          stroke={sourceColor(m.source)}
          strokeWidth={2}
          strokeDasharray={mode === 'both' ? '4 3' : undefined}
        />
      ))}
      {(mode === 'reconciled' || mode === 'both') && (
        <polygon
          points={pts(building.coordinates)}
          fill="#3A5A40"
          fillOpacity={mode === 'both' ? 0.18 : 0.35}
          stroke="#1B2B1F"
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
};
