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

interface InteractiveMapProps {
  buildings: BuildingEntity[];
  selectedBuilding: BuildingEntity | null;
  onSelectBuilding: (building: BuildingEntity) => void;
  language: Language;
  onOpenReconcileModal: () => void;
  onOpenUploadModal: () => void;
  activeFilter?: 'all' | 'reconciled' | 'review' | 'conflict';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  language,
  onOpenReconcileModal,
  onOpenUploadModal,
  activeFilter = 'all',
}) => {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cadastralLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const municipalLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gnssLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    imagery: true,
    buildings: true,
    cadastral: true,
    roads: true,
    gnss: true,
    municipal: false,
    reconciled: true,
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'review' | 'conflict'>(activeFilter);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Anchor: Domlur / Indiranagar, Bengaluru Urban
    const map = L.map(mapContainerRef.current, {
      center: [12.9784, 77.6408],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // Street tiles
    const streetTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
    });

    streetTiles.addTo(map);
    tileLayerRef.current = streetTiles;

    // Setup Layer Groups
    const polyGroup = L.layerGroup().addTo(map);
    const cadGroup = L.layerGroup().addTo(map);
    const munGroup = L.layerGroup().addTo(map);
    const roadGroup = L.layerGroup().addTo(map);
    const gnssGroup = L.layerGroup().addTo(map);

    polygonLayerGroupRef.current = polyGroup;
    cadastralLayerGroupRef.current = cadGroup;
    municipalLayerGroupRef.current = munGroup;
    roadsLayerGroupRef.current = roadGroup;
    gnssLayerGroupRef.current = gnssGroup;

    mapInstanceRef.current = map;

    // Draw simulated road lines & GNSS survey monuments
    renderRoads(roadGroup);
    renderGNSSMarkers(gnssGroup);

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
      });
      sat.addTo(mapInstanceRef.current);
      tileLayerRef.current = sat;
    } else {
      const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
      });
      streets.addTo(mapInstanceRef.current);
      tileLayerRef.current = streets;
    }
  }, [mapMode]);

  // Roads generator
  const renderRoads = (group: L.LayerGroup) => {
    group.clearLayers();
    // Two main intersecting avenues
    const mainAvenue: [number, number][] = [
      [12.9810, 77.6380],
      [12.9750, 77.6435],
    ];
    const crossStreet: [number, number][] = [
      [12.9755, 77.6375],
      [12.9805, 77.6440],
    ];

    L.polyline(mainAvenue, { color: '#94a3b8', weight: 6, opacity: 0.6, dashArray: '4, 4' }).addTo(group);
    L.polyline(crossStreet, { color: '#94a3b8', weight: 5, opacity: 0.6, dashArray: '4, 4' }).addTo(group);
  };

  // GNSS CORS benchmarks
  const renderGNSSMarkers = (group: L.LayerGroup) => {
    group.clearLayers();
    const corsPoints: { lat: number; lng: number; code: string }[] = [
      { lat: 12.9790, lng: 77.6400, code: "CORS-BLR-04" },
      { lat: 12.9765, lng: 77.6425, code: "GT-BENCH-12" },
      { lat: 12.9802, lng: 77.6420, code: "SOI-MON-89" },
    ];

    corsPoints.forEach(pt => {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        fillColor: '#0ea5e9',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      });
      marker.bindTooltip(`📍 GNSS Benchmark: ${pt.code}`, { direction: 'top', className: 'text-xs font-semibold' });
      marker.addTo(group);
    });
  };

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

      // Cadastral Layer (Muted Violet outline)
      if (activeLayers.cadastral && building.sources.cadastral) {
        const cadPoly = L.polygon(building.sources.cadastral.coordinates, {
          color: '#7D6D8A',
          weight: 1.2,
          fillColor: '#7D6D8A',
          fillOpacity: 0.1,
          dashArray: '2, 3',
        });
        cadPoly.addTo(cadGroup);
      }

      // Municipal GIS Layer (Muted Slate Blue outline)
      if (activeLayers.municipal && building.sources.municipal) {
        const munPoly = L.polygon(building.sources.municipal.coordinates, {
          color: '#4A6D7C',
          weight: 1.2,
          fillColor: '#4A6D7C',
          fillOpacity: 0.12,
        });
        munPoly.addTo(munGroup);
      }
    });
  }, [buildings, selectedBuilding, activeLayers, statusFilter, searchQuery]);

  // Handle Layer Toggle Visibilities
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (roadsLayerGroupRef.current) {
      if (activeLayers.roads) map.addLayer(roadsLayerGroupRef.current);
      else map.removeLayer(roadsLayerGroupRef.current);
    }

    if (gnssLayerGroupRef.current) {
      if (activeLayers.gnss) map.addLayer(gnssLayerGroupRef.current);
      else map.removeLayer(gnssLayerGroupRef.current);
    }
  }, [activeLayers]);

  // Pan to selected building
  useEffect(() => {
    if (selectedBuilding && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(selectedBuilding.centroid, { animate: true, duration: 0.8 });
    }
  }, [selectedBuilding]);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const resetView = () => {
    if (mapInstanceRef.current) {
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
                  <span className="text-[10px] bg-[#F1F3F0] text-[#5E6660] font-bold px-2 py-0.5 rounded-full">Active</span>
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

                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span className="flex items-center gap-2">
                      <span className="text-base">🗺</span>
                      <span>{t.layerCadastral}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.cadastral}
                      onChange={() => toggleLayer('cadastral')}
                      className="accent-[#7D6D8A] w-4 h-4 cursor-pointer rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span className="flex items-center gap-2">
                      <span className="text-base">🏛</span>
                      <span>{t.layerMunicipal}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.municipal}
                      onChange={() => toggleLayer('municipal')}
                      className="accent-[#4A6D7C] w-4 h-4 cursor-pointer rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span className="flex items-center gap-2">
                      <span className="text-base">🛣</span>
                      <span>{t.layerRoads}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.roads}
                      onChange={() => toggleLayer('roads')}
                      className="accent-[#5E6660] w-4 h-4 cursor-pointer rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:bg-[#F8F9F8] p-1.5 rounded-lg transition">
                    <span className="flex items-center gap-2">
                      <span className="text-base">📍</span>
                      <span>{t.layerGnss} (CORS)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeLayers.gnss}
                      onChange={() => toggleLayer('gnss')}
                      className="accent-[#3A5A40] w-4 h-4 cursor-pointer rounded"
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
