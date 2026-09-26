import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Search, 
  Satellite, 
  Map as MapIcon, 
  Sparkles, 
  Plus, 
  Minus, 
  Maximize2,
  Filter,
  Loader2,
  Database,
  AlertCircle,
  Copy,
  Check,
  X,
  ArrowRight,
  Sliders,
  Compass
} from 'lucide-react';
import { CanonicalEntity, Language, ClusteredCell } from '../types';
import { translations } from '../data/i18n';
import { api, BoundingBox } from '../services/api';

// Bounding box default center: Bengaluru Urban
const DEFAULT_CENTER: [number, number] = [12.95, 77.62];
const DEFAULT_ZOOM = 16;
const ZOOM_CLUSTER_THRESHOLD = 14;
const SAMPLE_BHU_ID = '2920TDR1W7B52E';

// Bounding box & center for 3D elevation rasters (Copernicus DSM, FABDEM DTM, nDSM)
const RASTER_BOUNDS: L.LatLngBoundsLiteral = [
  [12.9001389, 77.5798611],
  [12.9901389, 77.6598611],
];
const RASTER_CENTER: [number, number] = [12.9451389, 77.6198611];

type ElevationOverlayType = 'none' | 'dsm' | 'dtm' | 'ndsm' | 'hillshade';

// CARTO Basemaps API Key & Tile URL (Watermark-free Voyager)
const CARTO_API_KEY = 'cb1_3t9h_1_b35fdd0ac4ff8b854093aa4a';
const CARTO_STREET_TILES_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;

interface InteractiveMapProps {
  selectedBuilding: CanonicalEntity | null;
  onSelectBuilding: (building: CanonicalEntity | null) => void;
  language: Language;
  onOpenReconcileModal?: () => void;
  onOpenUploadModal?: () => void;
  activeFilter?: 'all' | 'reconciled' | 'review';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  selectedBuilding,
  onSelectBuilding,
  language,
  onOpenReconcileModal,
  onOpenUploadModal,
  activeFilter = 'all',
}) => {
  const t = translations[language] || {
    satelliteView: "Satellite",
    streetView: "Streets",
    searchPlaceholder: "Search by UID, source...",
    reconciled: "Reconciled",
    reviewRequired: "Review Required",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetView: "Reset View",
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polyLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const clusterLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const [elevationOverlay, setElevationOverlay] = useState<ElevationOverlayType>('none');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.65);
  const [showElevationPanel, setShowElevationPanel] = useState<boolean>(false);
  const elevationPanelRef = useRef<HTMLDivElement>(null);
  const rasterLayerRef = useRef<L.ImageOverlay | L.TileLayer | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'review'>(activeFilter);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [entityCount, setEntityCount] = useState<number>(0);
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  // Close search dropdown and elevation panel on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (elevationPanelRef.current && !elevationPanelRef.current.contains(e.target as Node)) {
        setShowElevationPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input change with Unicode NFKD normalization
  const handleSearchChange = (val: string) => {
    // Normalizes stylized math fonts (e.g. 𝐓𝐃𝐑𝟏𝐖𝟕𝐁𝟓𝟐𝐄) to standard ASCII (TDR1W7B52E)
    const normalized = val.normalize('NFKD');
    setSearchQuery(normalized);
    setSearchError(null);
  };

  // Debounced search query against backend for full-city coverage
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchEntities(q, 8);
        setSearchResults(results);
        setShowDropdown(true);
        if (results.length === 0) {
          setSearchError(`No buildings found for "${q}"`);
        } else {
          setSearchError(null);
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (entity: CanonicalEntity) => {
    setShowDropdown(false);
    onSelectBuilding(entity);

    if (mapInstanceRef.current && entity.geometry && entity.geometry.coordinates) {
      try {
        const coords = entity.geometry.coordinates[0];
        if (coords && coords.length > 0) {
          const lats = coords.map((c: number[]) => c[1]);
          const lons = coords.map((c: number[]) => c[0]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          const centroidLat = (minLat + maxLat) / 2;
          const centroidLon = (minLon + maxLon) / 2;

          mapInstanceRef.current.setView([centroidLat, centroidLon], 18, { animate: true });
        }
      } catch (err) {
        console.warn('Could not center on entity:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectSearchResult(searchResults[0]);
      } else if (searchQuery.trim()) {
        setIsSearching(true);
        api.searchEntities(searchQuery.trim(), 1)
          .then((res) => {
            if (res.length > 0) {
              handleSelectSearchResult(res[0]);
            } else {
              setSearchError(`No building found for "${searchQuery.trim()}"`);
              setShowDropdown(true);
            }
          })
          .catch(() => {
            setSearchError('Search failed');
            setShowDropdown(true);
          })
          .finally(() => setIsSearching(false));
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleCopy = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clean = text.normalize('NFKD').trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // Dedicated pane for elevation raster overlays (z-index 250, sits above base tiles but below polygons)
    map.createPane('rasterPane');
    const rasterPane = map.getPane('rasterPane');
    if (rasterPane) {
      rasterPane.style.zIndex = '250';
    }

    const streetTiles = L.tileLayer(CARTO_STREET_TILES_URL, {
      maxZoom: 20,
      subdomains: 'abcd',
    });
    streetTiles.addTo(map);
    tileLayerRef.current = streetTiles;

    const polyGroup = L.layerGroup().addTo(map);
    const clusterGroup = L.layerGroup().addTo(map);

    polyLayerGroupRef.current = polyGroup;
    clusterLayerGroupRef.current = clusterGroup;
    mapInstanceRef.current = map;

    // Check backend health
    api.getHealth().then((res) => {
      setApiOnline(res.status === 'ok');
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Map mode change (streets vs satellite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (mapMode === 'satellite') {
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      });
      sat.addTo(mapInstanceRef.current);
      tileLayerRef.current = sat;
    } else {
      const streets = L.tileLayer(CARTO_STREET_TILES_URL, {
        maxZoom: 20,
        subdomains: 'abcd',
      });
      streets.addTo(mapInstanceRef.current);
      tileLayerRef.current = streets;
    }
  }, [mapMode]);

  // Synchronize Elevation / DSM / DTM Raster Overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (rasterLayerRef.current) {
      map.removeLayer(rasterLayerRef.current);
      rasterLayerRef.current = null;
    }

    if (elevationOverlay === 'none') return;

    if (elevationOverlay === 'hillshade') {
      const hillshade = L.imageOverlay('/rasters/dsm_shaded_relief.png', RASTER_BOUNDS, {
        opacity: overlayOpacity,
        pane: 'rasterPane',
        interactive: false,
      });
      hillshade.addTo(map);
      rasterLayerRef.current = hillshade;
    } else if (elevationOverlay === 'dsm') {
      const dsm = L.imageOverlay('/rasters/dsm_copernicus.png', RASTER_BOUNDS, {
        opacity: overlayOpacity,
        pane: 'rasterPane',
        interactive: false,
      });
      dsm.addTo(map);
      rasterLayerRef.current = dsm;
    } else if (elevationOverlay === 'dtm') {
      const dtm = L.imageOverlay('/rasters/dtm_fabdem.png', RASTER_BOUNDS, {
        opacity: overlayOpacity,
        pane: 'rasterPane',
        interactive: false,
      });
      dtm.addTo(map);
      rasterLayerRef.current = dtm;
    } else if (elevationOverlay === 'ndsm') {
      const ndsm = L.imageOverlay('/rasters/ndsm_heights.png', RASTER_BOUNDS, {
        opacity: overlayOpacity,
        pane: 'rasterPane',
        interactive: false,
      });
      ndsm.addTo(map);
      rasterLayerRef.current = ndsm;
    }
  }, [elevationOverlay, overlayOpacity]);

  const handleFlyToRaster = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyToBounds(RASTER_BOUNDS, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  // Fetch viewport data
  const loadViewportData = useCallback(async () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const zoom = map.getZoom();
    setCurrentZoom(zoom);

    const bounds = map.getBounds();
    const bbox: BoundingBox = {
      minLon: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLon: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };

    setLoading(true);

    try {
      if (zoom < ZOOM_CLUSTER_THRESHOLD) {
        // Zoomed-out: Render coarse grid clusters
        if (polyLayerGroupRef.current) polyLayerGroupRef.current.clearLayers();
        const clusters: ClusteredCell[] = await api.getClustered(bbox, 250);
        if (clusterLayerGroupRef.current) {
          clusterLayerGroupRef.current.clearLayers();
          clusters.forEach((cell) => {
            const marker = L.circleMarker([cell.lat, cell.lon], {
              radius: Math.min(24, Math.max(8, Math.log2(cell.count + 1) * 4)),
              fillColor: cell.avg_confidence >= 0.7 ? '#3A5A40' : '#D9A05B',
              color: '#ffffff',
              weight: 2,
              fillOpacity: 0.8,
            });

            marker.bindTooltip(
              `<div class="p-1 text-xs">
                <b>${cell.count}</b> buildings<br/>
                Avg Conf: <b>${(cell.avg_confidence * 100).toFixed(0)}%</b>
              </div>`,
              { sticky: true }
            );

            marker.on('click', () => {
              map.setView([cell.lat, cell.lon], ZOOM_CLUSTER_THRESHOLD + 1);
            });

            marker.addTo(clusterLayerGroupRef.current!);
          });
        }
        setEntityCount(clusters.reduce((acc, c) => acc + c.count, 0));
      } else {
        // Zoomed-in: Render full polygons
        if (clusterLayerGroupRef.current) clusterLayerGroupRef.current.clearLayers();
        const entities = await api.getEntities(bbox, 2000);
        setEntityCount(entities.length);

        if (polyLayerGroupRef.current) {
          polyLayerGroupRef.current.clearLayers();

          const filtered = entities.filter((e) => {
            if (statusFilter === 'reconciled' && e.needs_review) return false;
            if (statusFilter === 'review' && !e.needs_review) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.normalize('NFKD').trim().toLowerCase();
              return (
                e.canonical_uid.toLowerCase().includes(q) ||
                (e.bhu_aadhar && e.bhu_aadhar.toLowerCase().includes(q)) ||
                e.sources.some((s) => s.toLowerCase().includes(q))
              );
            }
            return true;
          });

          // Ensure selectedBuilding is always drawn even if outside current bbox/filter
          const toRender = [...filtered];
          if (selectedBuilding && !toRender.some((e) => e.canonical_uid === selectedBuilding.canonical_uid)) {
            toRender.push(selectedBuilding);
          }

          toRender.forEach((entity) => {
            const isSelected = selectedBuilding?.canonical_uid === entity.canonical_uid;
            const isReview = entity.needs_review;

            const geojsonLayer = L.geoJSON(
              {
                type: 'Feature',
                geometry: entity.geometry as any,
                properties: entity,
              },
              {
                style: {
                  fillColor: isReview ? '#D9A05B' : '#3A5A40',
                  fillOpacity: isSelected ? 0.85 : 0.55,
                  color: isSelected ? '#1B2B1F' : (isReview ? '#B07D3E' : '#2D4632'),
                  weight: isSelected ? 3.5 : 1.5,
                  dashArray: isSelected ? '4, 4' : undefined,
                },
                onEachFeature: (feature, layer) => {
                  layer.bindTooltip(
                    `<div class="p-1.5 text-xs font-sans min-w-[200px]">
                      <div class="flex items-center gap-1.5 mb-1">
                        <span class="bg-[#3A5A40] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                          Bhu-Aadhar
                        </span>
                        <span class="font-mono font-bold text-[#1B2B1F] text-xs">
                          ${entity.bhu_aadhar || entity.canonical_uid.slice(0, 14)}
                        </span>
                      </div>
                      <div class="text-[#5E6660] text-[11px]">
                        ${entity.area_m2 ? `${Math.round(entity.area_m2)} m²` : 'N/A'} • ${entity.source_count} source${entity.source_count > 1 ? 's' : ''} (${entity.sources.join(', ')})
                      </div>
                      <div class="mt-1 font-bold ${isReview ? 'text-[#B07D3E]' : 'text-[#3A5A40]'} flex items-center justify-between">
                        <span>${(entity.confidence_score * 100).toFixed(1)}% Confidence</span>
                        <span class="text-[10px] uppercase">${isReview ? '⚠️ Review' : '✓ Reconciled'}</span>
                      </div>
                    </div>`,
                    { sticky: true }
                  );

                  layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    onSelectBuilding(entity);
                  });
                },
              }
            );

            geojsonLayer.addTo(polyLayerGroupRef.current!);
          });
        }
      }
      setApiOnline(true);
    } catch (err) {
      console.warn('Could not fetch map viewport data:', err);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, selectedBuilding, onSelectBuilding]);

  // Hook map events to fetch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    loadViewportData();

    const onMoveEnd = () => {
      loadViewportData();
    };

    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [loadViewportData]);

  // Center on selected building if changed externally
  useEffect(() => {
    if (!selectedBuilding || !mapInstanceRef.current) return;
    try {
      const geom = selectedBuilding.geometry;
      if (geom && geom.coordinates) {
        const coords = geom.coordinates[0];
        if (coords && coords.length > 0) {
          const lats = coords.map((c: number[]) => c[1]);
          const lons = coords.map((c: number[]) => c[0]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          mapInstanceRef.current.fitBounds([
            [minLat, minLon],
            [maxLat, maxLon],
          ], { maxZoom: 18, padding: [50, 50] });
        }
      }
    } catch (e) {}
  }, [selectedBuilding]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => mapInstanceRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  return (
    <div className="relative w-full h-full bg-[#FAF9F6] overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Search & Filter bar with autocomplete dropdown */}
        <div ref={searchContainerRef} className="relative flex flex-col pointer-events-auto z-30">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-[#E8E6E1]">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#5E6660] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Bhu-Aadhar (e.g. 2920TDR1W7B52E) or UID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0 || searchError) setShowDropdown(true);
                }}
                className="pl-9 pr-8 py-1.5 text-xs bg-transparent rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3A5A40] w-64 sm:w-80 text-[#1B2B1F] font-medium placeholder:text-[#A3A9A5]"
              />
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-[#F1F3F0] text-[#5E6660]"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-[#3A5A40] animate-spin absolute right-2.5" />
              )}
            </div>

            <div className="h-4 w-px bg-[#E8E6E1]" />

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {(['all', 'reconciled', 'review'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition ${
                    statusFilter === filter
                      ? 'bg-[#3A5A40] text-white shadow-2xs'
                      : 'text-[#5E6660] hover:bg-[#F1F3F0]'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'reconciled' ? 'Reconciled' : 'Review'}
                </button>
              ))}
            </div>
          </div>

          {/* Sample Suggestion Chip */}
          <div className="mt-1 flex items-center gap-1.5 px-2">
            <span className="text-[10px] text-[#5E6660] font-medium">Sample:</span>
            <button
              type="button"
              onClick={() => {
                handleSearchChange(SAMPLE_BHU_ID);
                api.searchEntities(SAMPLE_BHU_ID, 1).then((res) => {
                  if (res.length > 0) handleSelectSearchResult(res[0]);
                });
              }}
              className="text-[10px] font-mono font-bold text-[#3A5A40] bg-[#EAF2EA] hover:bg-[#D6E0D8] px-2 py-0.5 rounded-md border border-[#BDC9BF] transition flex items-center gap-1"
              title="Click to search sample Bhu-Aadhar"
            >
              <span>{SAMPLE_BHU_ID}</span>
              <span className="text-[9px] text-[#4A7C44] font-sans font-normal">(Click to test)</span>
            </button>
          </div>

          {/* Search Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 sm:w-96 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-[#BDC9BF] p-2 z-50 max-h-80 overflow-y-auto space-y-1">
              {searchError ? (
                <div className="p-3 text-center text-xs text-[#5E6660]">
                  <p className="font-semibold text-[#D66D54]">{searchError}</p>
                  <p className="text-[10px] text-[#A3A9A5] mt-1">
                    Try searching by 14-digit Bhu-Aadhar, 10-char PNIU suffix, or canonical UID.
                  </p>
                </div>
              ) : searchResults.length === 0 && isSearching ? (
                <div className="p-3 text-center text-xs text-[#5E6660] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3A5A40]" />
                  <span>Searching Bangalore spatial database...</span>
                </div>
              ) : (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Parcels ({searchResults.length})</span>
                    <span>Press Enter to Fly</span>
                  </div>
                  {searchResults.map((entity) => {
                    const bhu = entity.bhu_aadhar || entity.canonical_uid.slice(0, 14);
                    const isCopied = copiedId === entity.canonical_uid;
                    const conf = Math.round(entity.confidence_score * 100);
                    return (
                      <div
                        key={entity.canonical_uid}
                        onClick={() => handleSelectSearchResult(entity)}
                        className="p-2 rounded-xl hover:bg-[#F8F9F8] border border-transparent hover:border-[#E8E6E1] cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="bg-[#3A5A40] text-white text-[8px] font-mono font-bold px-1 rounded">
                              ULPIN
                            </span>
                            <span className="font-mono font-bold text-xs text-[#1B2B1F] truncate">
                              {bhu}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#5E6660] flex items-center gap-1">
                            <span>{entity.area_m2 ? `${Math.round(entity.area_m2)} m²` : 'N/A'}</span>
                            <span>•</span>
                            <span className={entity.needs_review ? 'text-[#B07D3E] font-medium' : 'text-[#3A5A40] font-medium'}>
                              {conf}% Conf ({entity.needs_review ? 'Review' : 'Reconciled'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(entity.canonical_uid, bhu, e)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isCopied
                                ? 'bg-[#EAF2EA] text-[#4A7C44]'
                                : 'hover:bg-[#EAF2EA] text-[#5E6660] hover:text-[#1B2B1F]'
                            }`}
                            title="Copy pure ASCII Bhu-Aadhar"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#4A7C44]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <ArrowRight className="w-3.5 h-3.5 text-[#A3A9A5] group-hover:text-[#3A5A40] transition" />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Status / Live Badge & Tile Mode Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live DB Connection Badge */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md border backdrop-blur-md ${
            apiOnline 
              ? 'bg-[#EAF2EA]/95 text-[#4A7C44] border-[#BDC9BF]' 
              : 'bg-[#FDF2F0]/95 text-[#D66D54] border-[#F8D7DA]'
          }`}>
            <Database className="w-3.5 h-3.5" />
            <span>{apiOnline ? `Live: ${entityCount} loaded` : 'Connecting to API...'}</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-[#3A5A40]" />}
          </div>

          {/* Elevation & 3D Raster Overlay Toggle Button & Dropdown */}
          <div className="relative" ref={elevationPanelRef}>
            <button
              onClick={() => setShowElevationPanel(!showElevationPanel)}
              className={`px-3 py-1.5 rounded-2xl shadow-md border backdrop-blur-md text-xs font-bold transition flex items-center gap-1.5 ${
                elevationOverlay !== 'none'
                  ? 'bg-[#3A5A40] text-white border-[#2D4632] shadow-sm'
                  : 'bg-white/95 text-[#2D312E] hover:bg-[#F1F3F0] border-[#E8E6E1]'
              }`}
              title="Toggle 3D Elevation & DSM/DTM Overlays"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {elevationOverlay === 'none'
                  ? '3D Elevation'
                  : elevationOverlay === 'dsm'
                  ? 'Copernicus DSM'
                  : elevationOverlay === 'dtm'
                  ? 'FABDEM DTM'
                  : elevationOverlay === 'ndsm'
                  ? 'nDSM Heights'
                  : 'ESRI Hillshade'}
              </span>
            </button>

            {/* Dropdown Menu for Elevation Overlays & Opacity */}
            {showElevationPanel && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-[#BDC9BF] p-3.5 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#3A5A40]" />
                    <span className="text-xs font-bold text-[#1B2B1F]">3D Elevation Overlays</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#EAF2EA] text-[#4A7C44] px-1.5 py-0.5 rounded">
                    30m Raster
                  </span>
                </div>

                {/* Overlay Selection Options */}
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => setElevationOverlay('none')}
                    className={`px-2.5 py-1.5 text-left rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      elevationOverlay === 'none'
                        ? 'bg-[#EAF2EA] text-[#3A5A40] border border-[#BDC9BF]'
                        : 'text-[#5E6660] hover:bg-[#F8F9F8] border border-transparent'
                    }`}
                  >
                    <span>None (Footprints Only)</span>
                    {elevationOverlay === 'none' && <Check className="w-3.5 h-3.5 text-[#3A5A40]" />}
                  </button>

                  <button
                    onClick={() => {
                      setElevationOverlay('dsm');
                      handleFlyToRaster();
                    }}
                    className={`px-2.5 py-1.5 text-left rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      elevationOverlay === 'dsm'
                        ? 'bg-[#EAF2EA] text-[#3A5A40] border border-[#BDC9BF]'
                        : 'text-[#5E6660] hover:bg-[#F8F9F8] border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1B2B1F]">Copernicus GLO-30 DSM</div>
                      <div className="text-[10px] text-[#78807A]">Rooftop surface elevation (865m–955m MSL)</div>
                    </div>
                    {elevationOverlay === 'dsm' && <Check className="w-3.5 h-3.5 text-[#3A5A40]" />}
                  </button>

                  <button
                    onClick={() => {
                      setElevationOverlay('dtm');
                      handleFlyToRaster();
                    }}
                    className={`px-2.5 py-1.5 text-left rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      elevationOverlay === 'dtm'
                        ? 'bg-[#EAF2EA] text-[#3A5A40] border border-[#BDC9BF]'
                        : 'text-[#5E6660] hover:bg-[#F8F9F8] border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1B2B1F]">FABDEM v1.2 DTM</div>
                      <div className="text-[10px] text-[#78807A]">Bare-earth ground terrain (ICESat-2 LiDAR)</div>
                    </div>
                    {elevationOverlay === 'dtm' && <Check className="w-3.5 h-3.5 text-[#3A5A40]" />}
                  </button>

                  <button
                    onClick={() => {
                      setElevationOverlay('ndsm');
                      handleFlyToRaster();
                    }}
                    className={`px-2.5 py-1.5 text-left rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      elevationOverlay === 'ndsm'
                        ? 'bg-[#EAF2EA] text-[#3A5A40] border border-[#BDC9BF]'
                        : 'text-[#5E6660] hover:bg-[#F8F9F8] border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1B2B1F]">nDSM Building Heights</div>
                      <div className="text-[10px] text-[#78807A]">Physical height heatmap (0m–22m+)</div>
                    </div>
                    {elevationOverlay === 'ndsm' && <Check className="w-3.5 h-3.5 text-[#3A5A40]" />}
                  </button>

                  <button
                    onClick={() => {
                      setElevationOverlay('hillshade');
                      handleFlyToRaster();
                    }}
                    className={`px-2.5 py-1.5 text-left rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      elevationOverlay === 'hillshade'
                        ? 'bg-[#EAF2EA] text-[#3A5A40] border border-[#BDC9BF]'
                        : 'text-[#5E6660] hover:bg-[#F8F9F8] border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1B2B1F]">Copernicus 3D Shaded Relief</div>
                      <div className="text-[10px] text-[#78807A]">Sun-illuminated 3D terrain & structure relief (4x)</div>
                    </div>
                    {elevationOverlay === 'hillshade' && <Check className="w-3.5 h-3.5 text-[#3A5A40]" />}
                  </button>
                </div>

                {/* Opacity Slider */}
                {elevationOverlay !== 'none' && (
                  <div className="pt-2 border-t border-[#E8E6E1] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#5E6660]">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-[#3A5A40]" />
                        Layer Opacity
                      </span>
                      <span className="font-mono font-bold text-[#1B2B1F]">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#3A5A40] cursor-pointer h-1.5 bg-[#E8E6E1] rounded-lg"
                    />
                  </div>
                )}

                {/* Quick Action: Center Raster */}
                <button
                  onClick={() => {
                    handleFlyToRaster();
                    setShowElevationPanel(false);
                  }}
                  className="w-full py-1.5 px-2 bg-[#F1F3F0] hover:bg-[#EAF2EA] text-[#3A5A40] text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-[#BDC9BF]"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Center on 3D Raster Extent</span>
                </button>
              </div>
            )}
          </div>

          {/* Map Base Tile Switcher */}
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-[#E8E6E1] flex items-center">
            <button
              onClick={() => setMapMode('streets')}
              className={`p-1.5 rounded-xl transition ${
                mapMode === 'streets'
                  ? 'bg-[#3A5A40] text-white shadow-2xs'
                  : 'text-[#5E6660] hover:bg-[#F1F3F0]'
              }`}
              title="Street View"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`p-1.5 rounded-xl transition ${
                mapMode === 'satellite'
                  ? 'bg-[#3A5A40] text-white shadow-2xs'
                  : 'text-[#5E6660] hover:bg-[#F1F3F0]'
              }`}
              title="Satellite Imagery"
            >
              <Satellite className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Zoom & Map Controls */}
      <div className="absolute right-4 bottom-6 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#E8E6E1] p-1 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 text-[#2D312E] hover:bg-[#F1F3F0] rounded-xl transition active:scale-95"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#E8E6E1] mx-1" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-[#2D312E] hover:bg-[#F1F3F0] rounded-xl transition active:scale-95"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetView}
          className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-[#E8E6E1] text-[#2D312E] hover:bg-[#F1F3F0] transition active:scale-95"
          title="Reset to District Extent"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute left-4 bottom-6 z-10 bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-2xl shadow-md border border-[#E8E6E1] text-xs space-y-2 max-w-[240px]">
        <div className="font-bold text-[#1B2B1F]">Reconciliation Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#3A5A40] border border-[#2D4632]" />
            <span className="text-[#5E6660]">Reconciled Footprint</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#D9A05B] border border-[#B07D3E]" />
            <span className="text-[#5E6660]">Needs Review</span>
          </div>
        </div>

        {/* Dynamic Elevation Legend when overlay is active */}
        {elevationOverlay !== 'none' && (
          <div className="pt-2 border-t border-[#E8E6E1] space-y-1">
            <div className="font-bold text-[11px] text-[#1B2B1F] flex items-center justify-between">
              <span>
                {elevationOverlay === 'dsm' && 'Copernicus DSM (MSL)'}
                {elevationOverlay === 'dtm' && 'FABDEM DTM (MSL)'}
                {elevationOverlay === 'ndsm' && 'nDSM Building Height'}
                {elevationOverlay === 'hillshade' && 'Copernicus 3D Shaded Relief'}
              </span>
            </div>

            {(elevationOverlay === 'dsm' || elevationOverlay === 'dtm') && (
              <div>
                <div
                  className="h-2.5 w-full rounded-md shadow-xs"
                  style={{
                    background:
                      'linear-gradient(to right, #30123b, #4686fb, #1ae4b6, #a2fc3c, #fbb82d, #e34608, #7a0403)',
                  }}
                />
                <div className="flex justify-between text-[9px] font-mono text-[#78807A] mt-0.5">
                  <span>865m</span>
                  <span>910m</span>
                  <span>955m MSL</span>
                </div>
              </div>
            )}

            {elevationOverlay === 'ndsm' && (
              <div>
                <div
                  className="h-2.5 w-full rounded-md shadow-xs"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(13,8,135,0.2), #6a00a8, #b12a90, #e16462, #fca636, #f0f921)',
                  }}
                />
                <div className="flex justify-between text-[9px] font-mono text-[#78807A] mt-0.5">
                  <span>0m (Ground)</span>
                  <span>10m (3 Fl)</span>
                  <span>22m+</span>
                </div>
              </div>
            )}

            {elevationOverlay === 'hillshade' && (
              <div className="text-[10px] text-[#78807A]">
                Copernicus 3D solar relief (Az 315°, Alt 45°, 4x exaggeration)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
