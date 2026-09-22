import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  Loader2, 
  Ruler, 
  Tag, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { CanonicalEntity, RawSourceFeature, Language } from '../types';
import { translations } from '../data/i18n';
import { api } from '../services/api';

const SOURCE_COLORS: Record<string, { stroke: string; fill: string; bg: string }> = {
  osm: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.25)', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  google_open_buildings: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  ai_extracted: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.25)', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
  cadastral: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const DEFAULT_SOURCE_COLOR = {
  stroke: '#64748b',
  fill: 'rgba(100, 116, 139, 0.25)',
  bg: 'bg-slate-50 text-slate-800 border-slate-200',
};

interface SourceComparisonModalProps {
  building: CanonicalEntity;
  onClose: () => void;
  language: Language;
}

export const SourceComparisonModal: React.FC<SourceComparisonModalProps> = ({
  building,
  onClose,
  language,
}) => {
  const t = translations[language];
  const [sourceFeatures, setSourceFeatures] = useState<RawSourceFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overlay' | 'reconciled'>('overlay');

  useEffect(() => {
    setLoading(true);
    api.getEntitySources(building.canonical_uid)
      .then((data) => {
        setSourceFeatures(data);
      })
      .catch((err) => {
        console.warn('Could not load source features:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [building.canonical_uid]);

  // Extract all coordinates from raw features + canonical geometry to establish common SVG bounds
  const getAllPoints = (): [number, number][] => {
    const points: [number, number][] = [];
    if (building.geometry && building.geometry.coordinates) {
      const ring = building.geometry.coordinates[0];
      if (ring) {
        ring.forEach((c: number[]) => points.push([c[0], c[1]]));
      }
    }
    sourceFeatures.forEach((sf) => {
      if (sf.geometry && sf.geometry.coordinates) {
        const ring = sf.geometry.coordinates[0];
        if (ring) {
          ring.forEach((c: number[]) => points.push([c[0], c[1]]));
        }
      }
    });
    return points;
  };

  const allPoints = getAllPoints();
  const lons = allPoints.map((p) => p[0]);
  const lats = allPoints.map((p) => p[1]);
  const minLon = lons.length ? Math.min(...lons) : 0;
  const maxLon = lons.length ? Math.max(...lons) : 1;
  const minLat = lats.length ? Math.min(...lats) : 0;
  const maxLat = lats.length ? Math.max(...lats) : 1;

  const padLon = (maxLon - minLon) * 0.25 || 0.0001;
  const padLat = (maxLat - minLat) * 0.25 || 0.0001;
  const bMinLon = minLon - padLon;
  const bMaxLon = maxLon + padLon;
  const bMinLat = minLat - padLat;
  const bMaxLat = maxLat + padLat;

  const toSvgPoints = (coords: number[][]): string => {
    if (!coords || coords.length === 0) return '';
    return coords
      .map(([lon, lat]) => {
        const x = ((lon - bMinLon) / (bMaxLon - bMinLon)) * 320;
        const y = (1 - (lat - bMinLat) / (bMaxLat - bMinLat)) * 320;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3A5A40] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#3A5A40]">
                {building.canonical_uid}
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1B2B1F]">
                Multi-Source Footprint Discrepancy & Reconciliation
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Left / Center: Interactive SVG Footprint Overlay */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl p-4 relative min-h-[340px]">
            
            {/* View Mode Toggle */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-[#E8E6E1]">
              <button
                onClick={() => setActiveTab('overlay')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'overlay' ? 'bg-[#3A5A40] text-white shadow-2xs' : 'text-[#5E6660]'
                }`}
              >
                Overlaid Sources
              </button>
              <button
                onClick={() => setActiveTab('reconciled')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'reconciled' ? 'bg-[#3A5A40] text-white shadow-2xs' : 'text-[#5E6660]'
                }`}
              >
                Reconciled Union
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-2 text-[#5E6660]">
                <Loader2 className="w-8 h-8 animate-spin text-[#3A5A40]" />
                <span className="text-xs font-semibold">Loading source geometries...</span>
              </div>
            ) : (
              <svg viewBox="0 0 320 320" className="w-full max-w-[300px] h-[300px]">
                {/* Grid Background Lines */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E8E6E1" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="320" height="320" fill="url(#grid)" />

                {/* Render Overlaid Raw Source Polygons */}
                {activeTab === 'overlay' &&
                  sourceFeatures.map((sf) => {
                    const color = SOURCE_COLORS[sf.source] || DEFAULT_SOURCE_COLOR;
                    const ring = sf.geometry?.coordinates?.[0];
                    if (!ring) return null;
                    const points = toSvgPoints(ring);
                    return (
                      <polygon
                        key={sf.id}
                        points={points}
                        stroke={color.stroke}
                        strokeWidth="2"
                        strokeDasharray="4, 4"
                        fill={color.fill}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                {/* Render Reconciled Polygon */}
                {building.geometry?.coordinates?.[0] && (
                  <polygon
                    points={toSvgPoints(building.geometry.coordinates[0])}
                    stroke="#2D4632"
                    strokeWidth={activeTab === 'reconciled' ? '3' : '2'}
                    fill={activeTab === 'reconciled' ? 'rgba(58, 90, 64, 0.6)' : 'none'}
                    className="transition-all duration-300"
                  />
                )}
              </svg>
            )}

            <div className="mt-2 text-[11px] text-[#5E6660] text-center">
              Coordinates normalized in EPSG:4326 from internal PostGIS UTM Zone 43N
            </div>
          </div>

          {/* Right: Sources Table & IoU Analysis */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-[#1B2B1F] mb-1">
                Discovered Source Footprints ({sourceFeatures.length || building.source_count})
              </h4>
              <p className="text-xs text-[#5E6660]">
                Geometric union merges boundaries while filtering offset discrepancies.
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sourceFeatures.length > 0 ? (
                sourceFeatures.map((sf) => {
                  const style = SOURCE_COLORS[sf.source] || DEFAULT_SOURCE_COLOR;
                  return (
                    <div
                      key={sf.id}
                      className={`p-3 rounded-xl border ${style.bg} flex items-center justify-between`}
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: style.stroke }}
                          />
                          {sf.source.toUpperCase().replace(/_/g, ' ')}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          ID: #{sf.id} • {sf.area_m2 ? `${Math.round(sf.area_m2)} m²` : 'Area N/A'}
                        </div>
                      </div>

                      {sf.extraction_confidence !== null && sf.extraction_confidence !== undefined && (
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold opacity-75">Confidence</div>
                          <div className="text-xs font-bold">
                            {(sf.extraction_confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs text-[#5E6660] text-center">
                  {loading ? 'Fetching source features...' : 'No multi-source features found.'}
                </div>
              )}
            </div>

            {/* Reconciliation Consensus Summary Card */}
            <div className="p-4 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2D4632]">
                <CheckCircle2 className="w-4 h-4 text-[#3A5A40]" />
                <span>Reconciliation Consensus</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[#5E6660]">Reconciled Area:</span>
                  <div className="font-bold text-[#1B2B1F]">
                    {building.area_m2 ? `${Math.round(building.area_m2)} m²` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-[#5E6660]">IoU Agreement:</span>
                  <div className="font-bold text-[#1B2B1F]">
                    {building.avg_iou_agreement !== null && building.avg_iou_agreement !== undefined
                      ? `${(building.avg_iou_agreement * 100).toFixed(1)}%`
                      : 'Single Source'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold transition shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
