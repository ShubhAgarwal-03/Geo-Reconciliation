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
  Plus, 
  Minus, 
  Maximize2,
  Crosshair,
  Filter
} from 'lucide-react';
import { BuildingEntity, Language } from '../types';
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
  onOpenReconcileModal: () => void;
  onOpenUploadModal: () => void;
  activeFilter?: 'all' | 'reconciled' | 'review' | 'conflict';
  /** 'live' | 'osm' | 'mock' — used only to know when the underlying dataset
   *  has genuinely changed (so the map re-fits bounds), not for styling. */
  dataSource?: 'live' | 'osm' | 'mock';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  language,
  onOpenReconcileModal,
  onOpenUploadModal,
  activeFilter = 'all',
  dataSource = 'mock',
}) => {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cadastralLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const municipalLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  // Tracks whether we've already auto-fit the map to real data once, so we
  // don't yank the user's pan/zoom on every re-render — only on genuinely
  // new datasets (mock → live swap, or first load).
  const lastFitKeyRef = useRef<string>('');

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    // The only two layers below with per-source geometry distinct from the
    // reconciled polygon would be cadastral/municipal — but the backend
    // (canonical_entities) doesn't return separate per-source geometry yet,
    // only which sources contributed. So those two stay off by default and
    // are disabled in the panel with an explanation, rather than drawing a
    // second outline that's secretly identical to the first.
    reconciled: true,
    cadastral: false,
    municipal: false,
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'review' | 'conflict'>(activeFilter);

  // Real check against the loaded data — not assumed true. Only meaningful
  // once the backend starts returning distinct per-source geometry.
  const hasCadastralGeometry = buildings.some((b) => b.sources.cadastral.coordinates.length > 0);
  const hasMunicipalGeometry = buildings.some((b) => b.sources.municipal.coordinates.length > 0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Anchor: Domlur / Indiranagar, Bengaluru Urban
    const map = L.map(mapContainerRef.current, {
      center: [12.9784, 77.6408],
      zoom: 17,
      zoomControl: false,
      // OpenStreetMap's tile usage policy requires visible attribution —
      // this was silently missing before (CARTO/Esri credit was never shown
      // either), fixed here rather than carried forward.
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);

    // Street tiles — see STREET_TILE_URL comment above for why OSM, not CARTO.
    const streetTiles = L.tileLayer(STREET_TILE_URL, {
      ...STREET_TILE_OPTIONS,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    streetTiles.addTo(map);
    tileLayerRef.current = streetTiles;

    // Setup Layer Groups
    const polyGroup = L.layerGroup().addTo(map);
    const cadGroup = L.layerGroup().addTo(map);
    const munGroup = L.layerGroup().addTo(map);

    polygonLayerGroupRef.current = polyGroup;
    cadastralLayerGroupRef.current = cadGroup;
    municipalLayerGroupRef.current = munGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Mode switch (Streets vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (mapMode === 'satellite') {
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
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

  // Render Building Polygons and Cadastral / Municipal Overlays
  useEffect(() => {
    const polyGroup = polygonLayerGroupRef.current;
    const cadGroup = cadastralLayerGroupRef.current;
    const munGroup = municipalLayerGroupRef.current;
    if (!polyGroup || !cadGroup || !munGroup) return;

    polyGroup.clearLayers();
    cadGroup.clearLayers();
    munGroup.clearLayers();

    const filtered = buildings.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.id.toLowerCase().includes(q) ||
          b.surveyNumber.toLowerCase().includes(q) ||
          b.landUse.toLowerCase().includes(q)
        );
      }
      return true;
    });

    filtered.forEach((building) => {
      const isSelected = selectedBuilding?.id === building.id;

      // Natural Tones Color mapping
      let fillColor = '#3A5A40'; // Moss Green: Reconciled
      let strokeColor = '#2D4632';

      if (building.status === 'conflict') {
        fillColor = '#D66D54'; // Coral: Conflict
        strokeColor = '#B8533D';
      } else if (building.status === 'review') {
        fillColor = '#D9A05B'; // Amber: Review
        strokeColor = '#B07D3E';
      }

      // Reconciled Unified Layer
      if (activeLayers.reconciled) {
        const polygon = L.polygon(building.coordinates, {
          fillColor: fillColor,
          fillOpacity: isSelected ? 0.8 : 0.5,
          color: isSelected ? '#1B2B1F' : strokeColor,
          weight: isSelected ? 3.5 : 1.5,
          dashArray: isSelected ? '5, 5' : undefined,
          className: 'cursor-pointer transition-all duration-200',
        });

        // Hover tooltip styled with Natural Tones
        polygon.bindTooltip(
          `<div class="p-1.5 font-sans">
            <div class="font-bold text-[#1B2B1F]">${building.id} <span class="text-xs font-medium text-[#5E6660]">(${building.surveyNumber})</span></div>
            <div class="text-xs text-[#5E6660] flex items-center gap-1 mt-0.5">
              <span>${building.area} m²</span> • <span>${building.landUse}</span>
            </div>
            <div class="mt-1 text-xs font-bold ${
              building.status === 'reconciled' ? 'text-[#3A5A40]' : building.status === 'review' ? 'text-[#B07D3E]' : 'text-[#D66D54]'
            }">
              ${building.confidence}% Confidence
            </div>
          </div>`,
          { sticky: true, className: 'rounded-xl shadow-md border border-[#E8E6E1] text-xs bg-white' }
        );

        polygon.on('click', () => {
          onSelectBuilding(building);
        });

        polygon.addTo(polyGroup);
      }

      // Cadastral Layer (Muted Violet outline). Guard on actual presence —
      // `building.sources.cadastral` is always a defined object (adapter.ts
      // fills it with sourceName: 'not captured' when absent), so checking
      // its truthiness alone would try to draw an empty polygon.
      if (activeLayers.cadastral && building.sources.cadastral.coordinates.length > 0) {
        const cadPoly = L.polygon(building.sources.cadastral.coordinates, {
          color: '#7D6D8A',
          weight: 1.2,
          fillColor: '#7D6D8A',
          fillOpacity: 0.1,
          dashArray: '2, 3',
        });
        cadPoly.addTo(cadGroup);
      }

      // Municipal GIS Layer (Muted Slate Blue outline). Same guard as above.
      if (activeLayers.municipal && building.sources.municipal.coordinates.length > 0) {
        const munPoly = L.polygon(building.sources.municipal.coordinates, {
          color: '#4A6D7C',
          weight: 1.2,
          fillColor: '#4A6D7C',
          fillOpacity: 0.12,
        });
        munPoly.addTo(munGroup);
      }
    });

    // Auto-fit the map to the real loaded data — once per distinct dataset,
    // not on every render (so panning/zooming while inspecting a building
    // doesn't get yanked back). Keyed on building count + source, so a
    // mock→live swap or a fresh reconcile run refits, but selecting a
    // building or toggling a layer doesn't.
    const fitKey = `${dataSource}:${buildings.length}`;
    if (
      mapInstanceRef.current &&
      buildings.length > 0 &&
      fitKey !== lastFitKeyRef.current
    ) {
      const allCoords = buildings.flatMap((b) => b.coordinates);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords as L.LatLngExpression[]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
      }
      lastFitKeyRef.current = fitKey;
    }
  }, [buildings, selectedBuilding, activeLayers, statusFilter, searchQuery, dataSource]);

  // Pan to selected building
  useEffect(() => {
    if (selectedBuilding && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(selectedBuilding.centroid, { animate: true, duration: 0.8 });
    }
  }, [selectedBuilding]);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Recenters on the real loaded dataset when there is one; only falls
  // back to the fixed pilot-district point when nothing has loaded yet.
  const resetView = () => {
    if (!mapInstanceRef.current) return;
    const allCoords = buildings.flatMap((b) => b.coordinates);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords as L.LatLngExpression[]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 18, animate: true });
    } else {
      mapInstanceRef.current.setView([12.9784, 77.6408], 17, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#FAF9F6] rounded-2xl overflow-hidden border border-[#E8E6E1] shadow-xs flex flex-col">
      
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md pointer-events-auto shadow-sm rounded-xl">
          <Search className="w-4 h-4 text-[#A3A9A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-[#1B2B1F] pl-10 pr-4 py-2.5 rounded-xl text-sm border border-[#E8E6E1] focus:outline-none focus:ring-2 focus:ring-[#3A5A40] font-medium placeholder:text-[#A3A9A5]"
          />
        </div>

        {/* Right Tools: Layers Drawer, Mode Toggle, Filter */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Status Filter Pill */}
          <div className="hidden sm:flex bg-white rounded-xl shadow-sm border border-[#E8E6E1] p-1 text-xs font-semibold text-[#5E6660]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'all' ? 'bg-[#1B2B1F] text-white shadow-2xs' : 'hover:bg-[#F8F9F8]'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('reconciled')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${statusFilter === 'reconciled' ? 'bg-[#3A5A40] text-white shadow-2xs' : 'text-[#4A7C44] hover:bg-[#EAF2EA]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#4A7C44]"></span>
              Verified
            </button>
            <button
              onClick={() => setStatusFilter('review')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${statusFilter === 'review' ? 'bg-[#B07D3E] text-white shadow-2xs' : 'text-[#B07D3E] hover:bg-[#FFF9F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D9A05B]"></span>
              Review
            </button>
            <button
              onClick={() => setStatusFilter('conflict')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${statusFilter === 'conflict' ? 'bg-[#D66D54] text-white shadow-2xs' : 'text-[#D66D54] hover:bg-[#FDF2F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D66D54]"></span>
              Conflict
            </button>
          </div>

          {/* Map / Satellite Toggle */}
          <button
            onClick={() => setMapMode(m => m === 'streets' ? 'satellite' : 'streets')}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F8F9F8] text-[#2D312E] px-3 py-2 rounded-xl text-xs font-bold border border-[#E8E6E1] shadow-sm transition"
            title="Toggle between Street map and High-resolution Satellite Imagery"
          >
            {mapMode === 'streets' ? (
              <>
                <Satellite className="w-4 h-4 text-[#3A5A40]" />
                <span className="hidden sm:inline">Satellite</span>
              </>
            ) : (
              <>
                <MapIcon className="w-4 h-4 text-[#3A5A40]" />
                <span className="hidden sm:inline">Streets</span>
              </>
            )}
          </button>

          {/* Layer Panel Button */}
          <div className="relative">
            <button
              onClick={() => setShowLayersDropdown(!showLayersDropdown)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition ${
                showLayersDropdown 
                  ? 'bg-[#3A5A40] text-white border-[#2D4632]' 
                  : 'bg-white hover:bg-[#F8F9F8] text-[#2D312E] border-[#E8E6E1]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layers</span>
            </button>

            {/* Layer Control Dropdown Panel */}
            {showLayersDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F0] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A3A9A5]">{t.dataLayers}</span>
                  <span className="text-[10px] bg-[#F1F3F0] text-[#5E6660] font-bold px-2 py-0.5 rounded-full">
                    {dataSource === 'live' ? 'Live' : dataSource === 'osm' ? 'OSM Reference' : 'Demo'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-semibold text-[#2D312E]">
                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <span>{t.layerReconciled}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.reconciled}
                      onChange={() => toggleLayer('reconciled')}
                      className="accent-[#3A5A40] w-4 h-4 cursor-pointer rounded"
                    />
                  </label>

                  {/* Cadastral/Municipal overlays: the backend's canonical_entities
                      table only records WHICH sources contributed, not each
                      source's own polygon — so there's no distinct geometry to
                      draw yet. Disabled rather than faking a second outline
                      that would secretly trace the exact same shape. */}
                  <label
                    className={`flex items-center justify-between p-1.5 rounded-lg transition ${
                      hasCadastralGeometry ? 'cursor-pointer hover:bg-[#F8F9F8]' : 'opacity-40 cursor-not-allowed'
                    }`}
                    title={hasCadastralGeometry ? undefined : 'Backend doesn\u2019t return separate cadastral geometry yet — only which entities include a cadastral source'}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🗺</span>
                      <span>{t.layerCadastral}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.cadastral}
                      disabled={!hasCadastralGeometry}
                      onChange={() => toggleLayer('cadastral')}
                      className="accent-[#7D6D8A] w-4 h-4 cursor-pointer rounded disabled:cursor-not-allowed"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between p-1.5 rounded-lg transition ${
                      hasMunicipalGeometry ? 'cursor-pointer hover:bg-[#F8F9F8]' : 'opacity-40 cursor-not-allowed'
                    }`}
                    title={hasMunicipalGeometry ? undefined : 'Backend doesn\u2019t return separate municipal geometry yet — only which entities include a municipal source'}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🏛</span>
                      <span>{t.layerMunicipal}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.municipal}
                      disabled={!hasMunicipalGeometry}
                      onChange={() => toggleLayer('municipal')}
                      className="accent-[#4A6D7C] w-4 h-4 cursor-pointer rounded disabled:cursor-not-allowed"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Map Canvas Element */}
      <div ref={mapContainerRef} className="w-full flex-1 relative" />

      {/* Empty-state overlay — only shown when there's genuinely nothing to
          show (no buildings loaded at all), pointing at the two real actions
          that would populate the map instead of leaving a blank canvas. */}
      {buildings.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#FAF9F6]/90 backdrop-blur-xs pointer-events-none">
          <div className="bg-white rounded-2xl shadow-md border border-[#E8E6E1] px-6 py-5 max-w-xs text-center pointer-events-auto">
            <p className="text-sm font-bold text-[#1B2B1F] mb-1">No entities loaded yet</p>
            <p className="text-xs text-[#5E6660] mb-4">
              Upload source data and run reconciliation to see real buildings plotted here.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onOpenUploadModal}
                className="px-3 py-1.5 rounded-lg border border-[#3A5A40] text-[#3A5A40] text-xs font-bold hover:bg-[#F8F9F8] transition"
              >
                Upload Data
              </button>
              <button
                onClick={onOpenReconcileModal}
                className="px-3 py-1.5 rounded-lg bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold transition"
              >
                Run Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Navigation Controls */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-2">
        <div className="bg-white rounded-xl shadow-md border border-[#E8E6E1] overflow-hidden flex flex-col">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2.5 hover:bg-[#F8F9F8] text-[#2D312E] transition active:bg-[#F1F3F0]"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-[#F1F3F0]" />
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2.5 hover:bg-[#F8F9F8] text-[#2D312E] transition active:bg-[#F1F3F0]"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={resetView}
          className="p-2.5 bg-white hover:bg-[#F8F9F8] text-[#2D312E] rounded-xl shadow-md border border-[#E8E6E1] transition active:bg-[#F1F3F0]"
          title="Center on Pilot Zone"
        >
          <Crosshair className="w-4 h-4 text-[#3A5A40]" />
        </button>
      </div>

      {/* Bottom Confidence Legend */}
      <div className="absolute left-4 bottom-4 z-20 bg-white/95 backdrop-blur-xs border border-[#E8E6E1] rounded-xl shadow-md px-3.5 py-2 hidden md:flex items-center gap-4 text-xs font-semibold text-[#2D312E]">
        <span className="text-[10px] uppercase font-bold text-[#A3A9A5] tracking-wider">Confidence</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#3A5A40] border border-[#2D4632]"></span>
          <span>90–100% {t.highConfidence}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#D9A05B] border border-[#B07D3E]"></span>
          <span>70–89% {t.reviewRecommended}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#D66D54] border border-[#B8533D]"></span>
          <span>&lt;70% {t.conflictDetected}</span>
        </div>
      </div>

    </div>
  );
};