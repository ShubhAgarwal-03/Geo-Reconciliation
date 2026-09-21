import React, { useState } from 'react';
import { 
  BuildingEntity, 
  Language, 
  ReconciliationStats 
} from '../types';
import { translations } from '../data/i18n';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Split, 
  TrendingUp, 
  ShieldCheck,
  RotateCcw,
  Sliders,
  Layers
} from 'lucide-react';

interface BeforeAfterViewProps {
  buildings: BuildingEntity[];
  stats: ReconciliationStats;
  language: Language;
  onGoToMap: () => void;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({
  buildings,
  stats,
  language,
  onGoToMap,
}) => {
  const t = translations[language];

  // View modes: 'split-screen' or 'slider'
  const [viewMode, setViewMode] = useState<'split' | 'slider'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100

  // Take sample buildings (first 16 for clean grid representation)
  const sampleBuildings = buildings.slice(0, 16);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      
      {/* Header & Impact Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">
              NAKSHA Impact Analysis
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight mt-1">
            Before vs After Reconciliation
          </h2>
          <p className="text-sm text-[#5E6660] mt-0.5">
            Visualizing the transformation from fragmented, conflicting multi-source land data into unified legal entities.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-[#F1F3F0] p-1 rounded-xl flex text-xs font-bold border border-[#E8E6E1]">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${viewMode === 'slider' ? 'bg-white text-[#1B2B1F] shadow-2xs' : 'text-[#5E6660] hover:text-[#1B2B1F]'}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Interactive Slider</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${viewMode === 'split' ? 'bg-white text-[#1B2B1F] shadow-2xs' : 'text-[#5E6660] hover:text-[#1B2B1F]'}`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            onClick={onGoToMap}
            className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Explore on Map
          </button>
        </div>
      </div>

      {/* Hero Summary Metrics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1: Conflicts Resolved */}
        <div className="bg-white rounded-2xl p-5 border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A9A5]">Conflict Reduction</span>
          <div className="flex items-baseline gap-3 my-2">
            <span className="text-3xl font-serif font-bold text-[#D66D54] line-through decoration-[#D66D54]/50">
              42
            </span>
            <ArrowRight className="w-5 h-5 text-[#A3A9A5] shrink-0" />
            <span className="text-4xl font-serif font-bold text-[#4A7C44]">
              11
            </span>
          </div>
          <div className="text-xs text-[#5E6660] flex items-center gap-1">
            <span className="font-bold text-[#4A7C44] bg-[#EAF2EA] px-2 py-0.5 rounded-md border border-[#BDC9BF]/50">
              74% Auto-Resolved
            </span>
            <span>by spatial AI</span>
          </div>
        </div>

        {/* Metric 2: Confidence Surge */}
        <div className="bg-white rounded-2xl p-5 border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A9A5]">Average Confidence</span>
          <div className="flex items-baseline gap-3 my-2">
            <span className="text-3xl font-serif font-bold text-[#A3A9A5]">
              82%
            </span>
            <ArrowRight className="w-5 h-5 text-[#A3A9A5] shrink-0" />
            <span className="text-4xl font-serif font-bold text-[#4A7C44]">
              94%
            </span>
          </div>
          <div className="text-xs text-[#5E6660] flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-[#4A7C44]" />
            <span className="font-bold text-[#1B2B1F]">+12% reliability gain</span>
          </div>
        </div>

        {/* Metric 3: Harmonized Entities */}
        <div className="bg-white rounded-2xl p-5 border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A9A5]">Harmonized Entities</span>
          <div className="my-2">
            <span className="text-4xl font-serif font-bold text-[#1B2B1F]">
              1,103
            </span>
            <span className="text-xs text-[#5E6660] font-semibold block mt-0.5">
              of 1,248 total parcels verified
            </span>
          </div>
          <div className="text-xs text-[#4A7C44] font-bold bg-[#EAF2EA] px-2.5 py-1 rounded-lg w-fit border border-[#BDC9BF]/50">
            Ready for Gazette Registration
          </div>
        </div>

      </div>

      {/* Main Interactive Comparison Stage */}
      {viewMode === 'slider' ? (
        <div className="bg-[#1B2B1F] rounded-3xl p-6 border border-[#2D4632] shadow-xl relative overflow-hidden">
          
          {/* Top Stage Instructions */}
          <div className="flex items-center justify-between mb-4 z-10 relative">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FDF2F0] text-[#D66D54] border border-[#F8D7DA]">
                BEFORE (Inconsistent: 42 conflicts, 82% conf.)
              </span>
            </div>

            <div className="text-xs text-[#BDC9BF] font-medium">
              Drag slider left/right to reveal AI reconciliation
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAF2EA] text-[#4A7C44] border border-[#BDC9BF]">
                AFTER (Reconciled: 11 conflicts, 94% conf.)
              </span>
            </div>
          </div>

          {/* Interactive Split Canvas */}
          <div className="relative w-full h-[460px] rounded-2xl overflow-hidden bg-[#142017] border border-[#2D4632] select-none">
            
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#3A5A40_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

            {/* Simulated Street network */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 border-y border-dashed border-[#BDC9BF] bg-white/5" />
              <div className="absolute left-1/3 top-0 bottom-0 w-10 border-x border-dashed border-[#BDC9BF] bg-white/5" />
              <div className="absolute right-1/3 top-0 bottom-0 w-10 border-x border-dashed border-[#BDC9BF] bg-white/5" />
            </div>

            {/* AFTER Layer (Natural Moss Reconciled - Stays on Base) */}
            <div className="absolute inset-0 p-8 grid grid-cols-4 gap-6 items-center justify-items-center">
              {sampleBuildings.map((b) => (
                <div
                  key={`after-${b.id}`}
                  className="w-24 h-20 rounded-xl bg-[#3A5A40]/30 border-2 border-[#4A7C44] flex flex-col items-center justify-center relative shadow-sm transition-all duration-300 group hover:scale-105"
                >
                  <span className="text-[10px] font-mono font-bold text-[#BDC9BF]">{b.id}</span>
                  <span className="text-xs font-bold text-white">{b.area} m²</span>
                  <span className="text-[9px] text-[#4A7C44] font-semibold">✓ 94% Verified</span>
                </div>
              ))}
            </div>

            {/* BEFORE Layer (Discrepant - Clipped by Slider) */}
            <div 
              className="absolute inset-0 p-8 grid grid-cols-4 gap-6 items-center justify-items-center bg-[#1B2B1F]/95 border-r-2 border-[#D9A05B] overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              {sampleBuildings.map((b, idx) => {
                const isConflict = idx % 3 === 0;
                return (
                  <div
                    key={`before-${b.id}`}
                    className={`w-24 h-20 rounded-lg flex flex-col items-center justify-center relative shadow-sm ${
                      isConflict 
                        ? 'border-2 border-dashed border-[#D66D54] bg-[#D66D54]/20 rotate-2 scale-105' 
                        : 'border-2 border-[#7D6D8A]/80 bg-[#7D6D8A]/10 -rotate-1'
                    }`}
                  >
                    <div className="absolute -inset-1 border border-[#4A6D7C]/60 rounded pointer-events-none opacity-60" />
                    <span className="text-[10px] font-mono font-bold text-[#A3A9A5]">{b.id}</span>
                    <span className="text-xs font-bold text-[#F8D7DA]">
                      {isConflict ? `${b.area + 38} m²?` : `${b.area} m²`}
                    </span>
                    <span className={`text-[9px] font-bold ${isConflict ? 'text-[#D66D54]' : 'text-[#D9A05B]'}`}>
                      {isConflict ? 'Conflict 61%' : 'Review 78%'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Slider Drag Handle Divider */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-[#D9A05B] cursor-ew-resize z-20 flex items-center justify-center shadow-lg"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-[#D9A05B] text-[#1B2B1F] flex items-center justify-center shadow-xl border-2 border-white font-bold text-xs">
                ↔
              </div>
            </div>

            {/* Invisible Range Input for Full Touch & Mouse Dragging */}
            <input
              type="range"
              min="5"
              max="95"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30"
            />
          </div>

        </div>
      ) : (
        /* Side-by-Side Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left: BEFORE */}
          <div className="bg-[#FAF9F6] rounded-3xl p-5 border border-[#E8E6E1] text-[#2D312E] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F0]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D66D54] block">
                  BEFORE: Inconsistent Source Data
                </span>
                <span className="text-xs text-[#5E6660]">42 boundary conflicts • 82% Avg Confidence</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FDF2F0] text-[#D66D54] border border-[#F8D7DA]">
                Raw Ingestion
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-2xl border border-[#E8E6E1]">
              {sampleBuildings.slice(0, 9).map((b, idx) => (
                <div
                  key={`side-before-${b.id}`}
                  className="p-3 rounded-xl border border-dashed border-[#D66D54]/60 bg-[#FDF2F0] flex flex-col items-center justify-center text-center"
                >
                  <span className="text-[10px] font-mono text-[#5E6660]">{b.id}</span>
                  <span className="text-xs font-bold text-[#D66D54] my-0.5">{b.area + (idx % 2 === 0 ? 24 : -16)} m²</span>
                  <span className="text-[9px] text-[#B07D3E] font-medium">Conflict</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#5E6660] leading-relaxed">
              Discrepancies caused by varied digitization scales, satellite tilt distortion, and uncalibrated property tax records.
            </p>
          </div>

          {/* Right: AFTER */}
          <div className="bg-[#EAF2EA] rounded-3xl p-5 border border-[#BDC9BF] text-[#1B2B1F] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#BDC9BF]/50">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#3A5A40] block">
                  AFTER: Reconciled Land Entities
                </span>
                <span className="text-xs text-[#5E6660]">11 review remaining • 94% Avg Confidence</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#4A7C44] border border-[#BDC9BF]">
                Consolidated
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-2xl border border-[#BDC9BF]/50">
              {sampleBuildings.slice(0, 9).map((b) => (
                <div
                  key={`side-after-${b.id}`}
                  className="p-3 rounded-xl border border-[#4A7C44] bg-[#EAF2EA]/50 flex flex-col items-center justify-center text-center"
                >
                  <span className="text-[10px] font-mono text-[#3A5A40] font-semibold">{b.id}</span>
                  <span className="text-xs font-bold text-[#1B2B1F] my-0.5">{b.area} m²</span>
                  <span className="text-[9px] text-[#4A7C44] font-semibold">✓ 94% Verified</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#5E6660] leading-relaxed">
              Harmonized unified legal geometry compliant with Survey of India NAKSHA guidelines.
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
