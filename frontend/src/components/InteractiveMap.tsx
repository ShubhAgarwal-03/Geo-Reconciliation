import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Search, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Satellite, 
  Map as MapIcon, 
  Sparkles, 
  Loader2,
  Plus, 
  Minus, 
  Maximize2,
  Crosshair,
  Filter
} from 'lucide-react';
import { BuildingEntity, Language } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../config';
import { sourceColor, sourceLabel, shortId } from '../data/sources';
import { Viewport, MIN_ENTITY_ZOOM } from '../hooks/useLiveBuildings';
import { translations } from '../data/i18n';

// CARTO's free basemaps.cartocdn.com raster tiles started requiring an API
// key as of late Aug 2026 — unauthenticated requests now render an
// "API KEY REQUIRED" watermark instead of the map. Standard OpenStreetMap
// tiles are the most durable keyless option (no account, no key, ever) so
// we use those for the street basemap. Satellite mode stays on Esri, which
// has remained keyless throughout.
const STREET_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREET_TILE_OPTIONS = { maxZoom: 19, subdomains: 'abc' };

interface InteractiveMapProps {
  buildings: BuildingEntity[];
  selectedBuilding: BuildingEntity | null;
  onSelectBuilding: (building: BuildingEntity) => void;
  language: Language;
  onViewportChange: (v: Viewport) => void;
  loading?: boolean;
  error?: string | null;
  truncated?: boolean;
  tooZoomedOut?: boolean;
  onRetry?: () => void;
  activeFilter?: 'all' | 'reconciled' | 'review' | 'conflict';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  language,
  onViewportChange,
  loading = false,
  error = null,
  truncated = false,
  tooZoomedOut = false,
  onRetry,
  activeFilter = 'all',
}) => {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sourceLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [activeLayers, setActiveLayers] = useState({ reconciled: true, sourceOutlines: true });
  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'review' | 'conflict'>(activeFilter);

  // Initialize map + report the viewport to the parent (which loads data for it).
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);

    const streetTiles = L.tileLayer(STREET_TILE_URL, {
      ...STREET_TILE_OPTIONS,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    streetTiles.addTo(map);
    tileLayerRef.current = streetTiles;

    polygonLayerGroupRef.current = L.layerGroup().addTo(map);
    sourceLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const report = () => {
      const b = map.getBounds();
      onViewportChangeRef.current({
        bbox: { minLon: b.getWest(), minLat: b.getSouth(), maxLon: b.getEast(), maxLat: b.getNorth() },
        zoom: map.getZoom(),
      });
    };
    map.on('moveend', report);
    report();

    return () => {
      map.off('moveend', report);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Streets vs Satellite
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    if (mapMode === 'satellite') {
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      });
      sat.addTo(mapInstanceRef.current);
      tileLayerRef.current = sat;
    } else {
      const streets = L.tileLayer(STREET_TILE_URL, {
        ...STREET_TILE_OPTIONS,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      streets.addTo(mapInstanceRef.current);
      tileLayerRef.current = streets;
    }
  }, [mapMode]);

  // Reconciled footprints
  useEffect(() => {
    const polyGroup = polygonLayerGroupRef.current;
    if (!polyGroup) return;
    polyGroup.clearLayers();
    if (!activeLayers.reconciled) return;

    const q = searchQuery.trim().toLowerCase();
    const list = selectedBuilding && !buildings.some((b) => b.id === selectedBuilding.id)
      ? [...buildings, selectedBuilding] : buildings;
    list
      .filter((b) => (statusFilter === 'all' || b.status === statusFilter) && (!q || b.id.toLowerCase().includes(q)))
      .forEach((building) => {
        const isSelected = selectedBuilding?.id === building.id;
        let fillColor = '#3A5A40', strokeColor = '#2D4632';
        if (building.status === 'conflict') { fillColor = '#D66D54'; strokeColor = '#B8533D'; }
        else if (building.status === 'review') { fillColor = '#D9A05B'; strokeColor = '#B07D3E'; }

        const polygon = L.polygon(building.coordinates, {
          fillColor,
          fillOpacity: isSelected ? 0.8 : 0.5,
          color: isSelected ? '#1B2B1F' : strokeColor,
          weight: isSelected ? 3.5 : 1.5,
          dashArray: isSelected ? '5, 5' : undefined,
        });
        polygon.bindTooltip(
          `<div class="p-1.5 font-sans">
            <div class="font-bold text-[#1B2B1F]">#${shortId(building.id)}</div>
            <div class="text-xs text-[#5E6660] mt-0.5">${building.area != null ? Math.round(building.area) + ' m²' : '—'} • ${building.sourcesCount} source${building.sourcesCount === 1 ? '' : 's'}</div>
            <div class="mt-1 text-xs font-bold">${building.confidence}% confidence</div>
          </div>`,
          { sticky: true, className: 'rounded-xl shadow-md border border-[#E8E6E1] text-xs bg-white' }
        );
        polygon.on('click', () => onSelectRef.current(building));
        polygon.addTo(polyGroup);
      });
  }, [buildings, selectedBuilding?.id, selectedBuilding?.status, activeLayers.reconciled, statusFilter, searchQuery]);

  // Real per-source outlines for the selected entity (from raw_features)
  useEffect(() => {
    const g = sourceLayerGroupRef.current;
    if (!g) return;
    g.clearLayers();
    if (!activeLayers.sourceOutlines || !selectedBuilding?.members) return;
    selectedBuilding.members.forEach((m) => {
      if (m.coordinates.length === 0) return;
      L.polygon(m.coordinates, {
        color: sourceColor(m.source), weight: 2, fillOpacity: 0.05, dashArray: '4, 4',
      }).bindTooltip(sourceLabel(m.source), { sticky: true }).addTo(g);
    });
  }, [selectedBuilding?.id, selectedBuilding?.members, activeLayers.sourceOutlines]);

  // Pan to selected building
  useEffect(() => {
    if (selectedBuilding && selectedBuilding.coordinates.length && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(selectedBuilding.centroid, { animate: true, duration: 0.8 });
    }
  }, [selectedBuilding?.id]);

  const toggleLayer = (k: keyof typeof activeLayers) => setActiveLayers((p) => ({ ...p, [k]: !p[k] }));
  const resetView = () => mapInstanceRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[#E8E6E1] shadow-xs flex flex-col">

      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="relative flex-1 max-w-md pointer-events-auto shadow-sm rounded-xl">
          <Search className="w-4 h-4 text-[#A3A9A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter loaded entities by ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-[#1B2B1F] pl-10 pr-4 py-2.5 rounded-xl text-sm border border-[#E8E6E1] focus:outline-none focus:ring-2 focus:ring-[#3A5A40] font-medium placeholder:text-[#A3A9A5]"
          />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex bg-white rounded-xl shadow-sm border border-[#E8E6E1] p-1 text-xs font-semibold text-[#5E6660]">
            {([
              ['all', 'All', 'bg-[#1B2B1F] text-white', 'hover:bg-[#F8F9F8]', null],
              ['reconciled', 'Verified', 'bg-[#3A5A40] text-white', 'text-[#4A7C44] hover:bg-[#EAF2EA]', '#4A7C44'],
              ['review', 'Review', 'bg-[#B07D3E] text-white', 'text-[#B07D3E] hover:bg-[#FFF9F0]', '#D9A05B'],
              ['conflict', 'Rejected', 'bg-[#D66D54] text-white', 'text-[#D66D54] hover:bg-[#FDF2F0]', '#D66D54'],
            ] as const).map(([key, label, on, off, dot]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${statusFilter === key ? on + ' shadow-2xs' : off}`}
              >
                {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }}></span>}
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMapMode((m) => (m === 'streets' ? 'satellite' : 'streets'))}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F8F9F8] text-[#2D312E] px-3 py-2 rounded-xl text-xs font-bold border border-[#E8E6E1] shadow-sm transition"
            title="Toggle between street map and satellite imagery"
          >
            {mapMode === 'streets' ? (
              <><Satellite className="w-4 h-4 text-[#3A5A40]" /><span className="hidden sm:inline">Satellite</span></>
            ) : (
              <><MapIcon className="w-4 h-4 text-[#3A5A40]" /><span className="hidden sm:inline">Streets</span></>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowLayersDropdown(!showLayersDropdown)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition ${
                showLayersDropdown ? 'bg-[#3A5A40] text-white border-[#2D4632]' : 'bg-white hover:bg-[#F8F9F8] text-[#2D312E] border-[#E8E6E1]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layers</span>
            </button>

            {showLayersDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] p-4 z-30">
                <div className="pb-2 border-b border-[#F1F3F0] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A3A9A5]">{t.dataLayers}</span>
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-[#2D312E]">
                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span>{t.layerReconciled} footprints</span>
                    <input type="checkbox" checked={activeLayers.reconciled} onChange={() => toggleLayer('reconciled')} className="accent-[#3A5A40] w-4 h-4 cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span>Source outlines (selected)</span>
                    <input type="checkbox" checked={activeLayers.sourceOutlines} onChange={() => toggleLayer('sourceOutlines')} className="accent-[#3A5A40] w-4 h-4 cursor-pointer" />
                  </label>
                  {selectedBuilding?.members && (
                    <div className="pt-2 border-t border-[#F1F3F0] space-y-1">
                      {Array.from(new Set(selectedBuilding.members.map((m) => m.source))).map((s) => (
                        <div key={s} className="flex items-center gap-2 text-[11px] text-[#5E6660] font-medium">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColor(s) }} />
                          {sourceLabel(s)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 relative" />

      {/* Status strip (loading / zoom hint / truncation / error) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {tooZoomedOut && (
          <div className="bg-white/95 border border-[#E8E6E1] rounded-xl shadow-md px-4 py-2 text-xs font-semibold text-[#2D312E]">
            Zoom in to level {MIN_ENTITY_ZOOM}+ to load building footprints
          </div>
        )}
        {!tooZoomedOut && loading && (
          <div className="bg-white/95 border border-[#E8E6E1] rounded-xl shadow-md px-3 py-1.5 text-xs font-semibold text-[#5E6660] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading buildings…
          </div>
        )}
        {!tooZoomedOut && !loading && truncated && (
          <div className="bg-[#FFF9F0] border border-[#FDEACD] rounded-xl shadow-md px-4 py-2 text-xs font-semibold text-[#B07D3E]">
            Showing the first {buildings.length.toLocaleString()} buildings in view — zoom in to see the rest
          </div>
        )}
        {error && (
          <div className="bg-[#FDF2F0] border border-[#F8D7DA] rounded-xl shadow-md px-4 py-2.5 text-xs text-[#902A1A] pointer-events-auto max-w-sm text-center">
            <p className="font-bold">Couldn’t reach the reconciliation API.</p>
            <p className="mt-0.5 text-[#5E6660]">The server may be waking up (free hosting can take up to a minute).</p>
            {onRetry && (
              <button onClick={onRetry} className="mt-2 px-3 py-1 rounded-lg bg-[#3A5A40] text-white font-bold hover:bg-[#2D4632] transition">
                Retry
              </button>
            )}
          </div>
        )}
        {!error && !loading && !tooZoomedOut && buildings.length === 0 && (
          <div className="bg-white/95 border border-[#E8E6E1] rounded-xl shadow-md px-4 py-2 text-xs font-semibold text-[#5E6660]">
            No reconciled buildings in this view — pan back to the pilot area
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-2">
        <div className="bg-white rounded-xl shadow-md border border-[#E8E6E1] overflow-hidden flex flex-col">
          <button onClick={() => mapInstanceRef.current?.zoomIn()} className="p-2.5 hover:bg-[#F8F9F8] text-[#2D312E] transition" title="Zoom in">
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-[#F1F3F0]" />
          <button onClick={() => mapInstanceRef.current?.zoomOut()} className="p-2.5 hover:bg-[#F8F9F8] text-[#2D312E] transition" title="Zoom out">
            <Minus className="w-4 h-4" />
          </button>
        </div>
        <button onClick={resetView} className="p-2.5 bg-white hover:bg-[#F8F9F8] rounded-xl shadow-md border border-[#E8E6E1] transition" title="Back to pilot area">
          <Crosshair className="w-4 h-4 text-[#3A5A40]" />
        </button>
      </div>

      {/* Legend — matches the actual fill colours (status), not confidence bands */}
      <div className="absolute left-4 bottom-4 z-20 bg-white/95 backdrop-blur-xs border border-[#E8E6E1] rounded-xl shadow-md px-3.5 py-2 hidden md:flex items-center gap-4 text-xs font-semibold text-[#2D312E]">
        <span className="text-[10px] uppercase font-bold text-[#A3A9A5] tracking-wider">Status</span>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3A5A40] border border-[#2D4632]"></span><span>Verified</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#D9A05B] border border-[#B07D3E]"></span><span>Needs review</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#D66D54] border border-[#B8533D]"></span><span>Rejected by reviewer</span></div>
      </div>
    </div>
  );
};
