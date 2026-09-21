import React, { useState, useEffect } from 'react';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  RotateCcw, 
  Ruler, 
  Info, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SourceComparisonModalProps {
  building: BuildingEntity;
  onClose: () => void;
  language: Language;
}

export const SourceComparisonModal: React.FC<SourceComparisonModalProps> = ({
  building,
  onClose,
  language,
}) => {
  const t = translations[language];
  
  // States: 'separate' (overlaid separate source polygons) vs 'reconciling' (animating) vs 'merged' (unified entity)
  const [animationState, setAnimationState] = useState<'separate' | 'reconciling' | 'merged'>('separate');
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | 'ori' | 'municipal' | 'cadastral' | 'ai'>('all');
  const [showMeasurements, setShowMeasurements] = useState(true);

  // Trigger reconciliation transition
  const handleReconcileTransition = () => {
    setAnimationState('reconciling');
    setTimeout(() => {
      setAnimationState('merged');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore if canvas not supported
      }
    }, 1200);
  };

  const handleReset = () => {
    setAnimationState('separate');
  };

  // Convert lat/lng coordinates to normalized SVG points (280x280 viewBox)
  const getNormalizedSvgPoints = (coords: [number, number][], jitterScale = 1.0, jitterRotate = 0, offsetX = 0, offsetY = 0) => {
    if (!coords || coords.length === 0) return "";
    
    // In 'merged' state, all shapes collapse into the unified polygon
    const effectiveCoords = (animationState === 'merged') ? building.coordinates : coords;
    const effOffsetX = (animationState === 'merged') ? 0 : offsetX;
    const effOffsetY = (animationState === 'merged') ? 0 : offsetY;

    // Find bounding box of base building
    const lats = building.coordinates.map(c => c[0]);
    const lngs = building.coordinates.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padLat = (maxLat - minLat) * 0.4 || 0.0001;
    const padLng = (maxLng - minLng) * 0.4 || 0.0001;

    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;

    return effectiveCoords.map(([lat, lng]) => {
      const x = ((lng - bMinLng) / (bMaxLng - bMinLng)) * 280 + effOffsetX;
      const y = (1 - (lat - bMinLat) / (bMaxLat - bMinLat)) * 280 + effOffsetY;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };

  const sourcesList = [
    {
      id: 'ori' as const,
      name: "Drone Imagery (ORI)",
      agency: "Survey of India (5cm GSD)",
      area: building.sources.ori.area,
      color: "#D9A05B",
      bgClass: "bg-[#FFF9F0] border-[#F3E1C6] text-[#1B2B1F]",
      accent: "#D9A05B",
      coords: building.sources.ori.coordinates,
      offsetX: -6,
      offsetY: 4,
    },
    {
      id: 'municipal' as const,
      name: "Municipal GIS",
      agency: "Property Tax Cadastre",
      area: building.sources.municipal.area,
      color: "#4A708B",
      bgClass: "bg-[#F0F5F9] border-[#C8D9E6] text-[#1B2B1F]",
      accent: "#4A708B",
      coords: building.sources.municipal.coordinates,
      offsetX: 8,
      offsetY: -7,
    },
    {
      id: 'cadastral' as const,
      name: "Cadastral Map",
      agency: "Revenue Survey (Khasra)",
      area: building.sources.cadastral.area,
      color: "#7E6E85",
      bgClass: "bg-[#F7F4F9] border-[#DFD8E6] text-[#1B2B1F]",
      accent: "#7E6E85",
      coords: building.sources.cadastral.coordinates,
      offsetX: 0,
      offsetY: 0,
    },
    {
      id: 'ai' as const,
      name: "AI Feature Extraction",
      agency: "SAM-2 + DTM Segmentation",
      area: building.sources.ai.area,
      color: "#3A5A40",
      bgClass: "bg-[#EAF2EA] border-[#BDC9BF] text-[#1B2B1F]",
      accent: "#3A5A40",
      coords: building.sources.ai.coordinates,
      offsetX: 3,
      offsetY: 2,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">
                Multi-Source Harmonization
              </span>
              <span className="text-xs text-[#5E6660] font-mono">Building #{building.id}</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-[#1B2B1F] mt-1">
              Geospatial Footprint Comparison & Reconciliation
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Banner: Core Purpose Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1B2B1F] text-white shadow-sm border border-[#2D4632]">
            <div>
              <span className="text-[10px] font-bold text-[#BDC9BF] uppercase tracking-wider block">
                NAKSHA Core Purpose
              </span>
              <div className="text-lg font-serif font-bold flex items-center gap-2 text-white">
                <span>{t.fourSourcesToOne}</span>
              </div>
              <p className="text-xs text-[#BDC9BF]/80">
                Harmonizing varying boundaries, scales, coordinate discrepancies, and survey dates.
              </p>
            </div>

            {animationState === 'separate' ? (
              <button
                onClick={handleReconcileTransition}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3A5A40] hover:bg-[#2D4632] text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 border border-[#BDC9BF]/40"
              >
                <Sparkles className="w-4 h-4" />
                <span>Reconcile to Unified Geometry</span>
              </button>
            ) : animationState === 'reconciling' ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2D4632] text-white font-bold text-xs rounded-xl border border-[#3A5A40]">
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Resolving differences...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#2D4632] hover:bg-[#3A5A40] text-white text-xs font-semibold rounded-xl transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Show Discrepancy</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#EAF2EA]/20 text-emerald-300 border border-[#BDC9BF]/40 rounded-xl text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unified: 505 m² (94%)</span>
                </div>
              </div>
            )}
          </div>

          {/* Center Stage: Split Screen with Source Cards on Left and Visual Canvas on Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left 4 Source Cards */}
            <div className="md:col-span-6 space-y-2.5">
              <span className="text-xs font-bold text-[#5E6660] uppercase tracking-wider block">
                Independent Input Sources
              </span>

              {sourcesList.map((src) => {
                const isActive = activeSourceFilter === 'all' || activeSourceFilter === src.id;
                const isDiff = src.area !== building.area;

                return (
                  <div
                    key={src.id}
                    onClick={() => setActiveSourceFilter(activeSourceFilter === src.id ? 'all' : src.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      isActive 
                        ? `${src.bgClass} shadow-xs` 
                        : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#A3A9A5] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                          style={{ backgroundColor: src.color }}
                        />
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-[#1B2B1F]">{src.name}</h4>
                          <span className="text-[10px] text-[#5E6660] block">{src.agency}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-[#1B2B1F]">{src.area} m²</span>
                        {isDiff && (
                          <span className={`text-[10px] font-bold block ${
                            src.area > building.area ? 'text-[#4A708B]' : 'text-[#D9A05B]'
                          }`}>
                            {src.area > building.area ? `+${src.area - building.area} m²` : `${src.area - building.area} m²`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Final Result Summary Card */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                animationState === 'merged' 
                  ? 'bg-[#EAF2EA] border-[#BDC9BF] text-[#1B2B1F] shadow-sm ring-2 ring-[#3A5A40]/20' 
                  : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2D312E]'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${animationState === 'merged' ? 'text-[#3A5A40]' : 'text-[#A3A9A5]'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1B2B1F]">
                      {animationState === 'merged' ? 'Unified Reconciled Parcel' : 'Target Reconciled Entity'}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#BDC9BF] text-[#4A7C44]">
                    94% Confidence
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-serif font-bold text-[#1B2B1F]">505 m²</span>
                  <span className="text-xs text-[#5E6660] font-medium">Cadastral & Drone ORI Convergence</span>
                </div>
              </div>

            </div>

            {/* Right Interactive SVG Overlay Canvas */}
            <div className="md:col-span-6 bg-[#17231B] rounded-3xl p-4 sm:p-6 border border-[#2D4632] shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
              
              {/* Subtle grid pattern in canvas background */}
              <div className="absolute inset-0 bg-[radial-gradient(#2D4632_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

              {/* Status Pill in Canvas */}
              <div className="absolute top-4 left-4 z-10 bg-[#1B2B1F]/90 backdrop-blur-xs border border-[#2D4632] px-3 py-1 rounded-full text-[11px] font-bold text-[#FAF9F6] flex items-center gap-1.5 shadow-md">
                <span className={`w-2 h-2 rounded-full ${animationState === 'merged' ? 'bg-[#3A5A40] animate-pulse' : 'bg-[#D9A05B]'}`}></span>
                <span>
                  {animationState === 'separate' 
                    ? 'Displaying 4 Discrepant Footprints' 
                    : animationState === 'reconciling' 
                    ? 'Morphing Geometries...' 
                    : 'Unified Reconciled Footprint'}
                </span>
              </div>

              {/* Main SVG Visualization */}
              <div className="relative w-64 h-64 flex items-center justify-center my-2">
                <svg
                  viewBox="0 0 280 280"
                  className="w-full h-full overflow-visible"
                >
                  {/* Grid Crosshairs */}
                  <line x1="140" y1="20" x2="140" y2="260" stroke="#2D4632" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="20" y1="140" x2="260" y2="140" stroke="#2D4632" strokeWidth="0.8" strokeDasharray="3,3" />

                  {/* 1. Cadastral (Purple) */}
                  {(activeSourceFilter === 'all' || activeSourceFilter === 'cadastral') && (
                    <polygon
                      points={getNormalizedSvgPoints(building.sources.cadastral.coordinates, 1.0, 0, 0, 0)}
                      fill={animationState === 'merged' ? '#3A5A40' : '#7E6E85'}
                      fillOpacity={animationState === 'merged' ? '0.6' : '0.25'}
                      stroke={animationState === 'merged' ? '#3A5A40' : '#7E6E85'}
                      strokeWidth={animationState === 'merged' ? '2.5' : '1.8'}
                      strokeDasharray={animationState === 'merged' ? undefined : '4, 3'}
                      className="transition-all duration-700 ease-out"
                    />
                  )}

                  {/* 2. Municipal (Blue) */}
                  {(activeSourceFilter === 'all' || activeSourceFilter === 'municipal') && (
                    <polygon
                      points={getNormalizedSvgPoints(building.sources.municipal.coordinates, 1.02, -1, 8, -7)}
                      fill={animationState === 'merged' ? '#3A5A40' : '#4A708B'}
                      fillOpacity={animationState === 'merged' ? '0.6' : '0.25'}
                      stroke={animationState === 'merged' ? '#3A5A40' : '#4A708B'}
                      strokeWidth={animationState === 'merged' ? '2.5' : '1.8'}
                      className="transition-all duration-700 ease-out"
                    />
                  )}

                  {/* 3. Drone ORI (Amber) */}
                  {(activeSourceFilter === 'all' || activeSourceFilter === 'ori') && (
                    <polygon
                      points={getNormalizedSvgPoints(building.sources.ori.coordinates, 0.98, 0.5, -6, 4)}
                      fill={animationState === 'merged' ? '#3A5A40' : '#D9A05B'}
                      fillOpacity={animationState === 'merged' ? '0.6' : '0.25'}
                      stroke={animationState === 'merged' ? '#3A5A40' : '#D9A05B'}
                      strokeWidth={animationState === 'merged' ? '2.5' : '1.8'}
                      className="transition-all duration-700 ease-out"
                    />
                  )}

                  {/* 4. AI Feature Extraction (Sage/Teal) */}
                  {(activeSourceFilter === 'all' || activeSourceFilter === 'ai') && (
                    <polygon
                      points={getNormalizedSvgPoints(building.sources.ai.coordinates, 0.99, 0.2, 3, 2)}
                      fill={animationState === 'merged' ? '#3A5A40' : '#4A7C44'}
                      fillOpacity={animationState === 'merged' ? '0.6' : '0.25'}
                      stroke={animationState === 'merged' ? '#3A5A40' : '#4A7C44'}
                      strokeWidth={animationState === 'merged' ? '2.5' : '1.8'}
                      strokeDasharray={animationState === 'merged' ? undefined : '2, 2'}
                      className="transition-all duration-700 ease-out"
                    />
                  )}

                  {/* Reconciled Clean Boundary Highlight */}
                  {animationState === 'merged' && (
                    <polygon
                      points={getNormalizedSvgPoints(building.coordinates)}
                      fill="#3A5A40"
                      fillOpacity="0.4"
                      stroke="#A3B899"
                      strokeWidth="3.5"
                      className="transition-all duration-500 animate-pulse"
                    />
                  )}

                  {/* Centroid Marker */}
                  <circle cx="140" cy="140" r="3.5" fill="#ffffff" stroke="#3A5A40" strokeWidth="2" />
                </svg>
              </div>

              {/* Bottom Canvas Callout */}
              <div className="text-center mt-2 z-10">
                {animationState === 'merged' ? (
                  <div className="text-xs font-bold text-[#BDC9BF] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#3A5A40]" />
                    <span>Reconciled Area: 505 m² • IoU Consensus 0.96</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#A3A9A5] flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D9A05B]"></span>
                    <span>Max boundary offset: 1.4m between Municipal & Cadastral</span>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <span className="text-xs text-[#5E6660]">
            NAKSHA Spatial Agreement Pipeline v3.4 • EPSG:4326
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1B2B1F] hover:bg-[#2D312E] text-white text-xs font-bold transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
