import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/i18n';

interface ReconciliationModalProps {
  onClose: () => void;
  language: Language;
  onComplete: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  onClose,
  language,
  onComplete,
}) => {
  const t = translations[language];

  // Pipeline stage items
  const pipelineStages = [
    { id: 1, title: "Data imported", subtitle: "ORI, Cadastral, Municipal, GNSS datasets ingested", defaultDoneAt: 15 },
    { id: 2, title: "Coordinate systems aligned", subtitle: "CRS transformed (EPSG:32643 & EPSG:7760 → EPSG:4326)", defaultDoneAt: 30 },
    { id: 3, title: "Features extracted", subtitle: "SAM-2 + DTM elevation edge extraction completed", defaultDoneAt: 45 },
    { id: 4, title: "Spatial matching", subtitle: "Centroid and bounding box IoU correlation calculated", defaultDoneAt: 60 },
    { id: 5, title: "Resolving conflicts", subtitle: "Boundary consensus algorithms resolving eave discrepancies", defaultDoneAt: 75 },
    { id: 6, title: "Confidence scoring", subtitle: "Bayesian multi-criteria agreement indices applied", defaultDoneAt: 90 },
    { id: 7, title: "Generating unified layer", subtitle: "Consolidated Digital Land Entities written to master catalog", defaultDoneAt: 100 },
  ];

  const [progress, setProgress] = useState(68);
  const [isSimulating, setIsSimulating] = useState(true);

  // Animated progress increment
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsSimulating(false);
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Derived processed stats
  const processedCount = Math.min(1248, Math.round((progress / 100) * 1248));
  const matchedCount = Math.min(1103, Math.round((progress / 100) * 1103));
  const conflictsDetected = 42;
  const autoResolved = Math.min(31, Math.round((progress / 100) * 31));
  const requiresReview = 11;
  const avgConfidence = (82 + (progress / 100) * 11.4).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3A5A40] flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44]">
                NAKSHA Automated Reconciliation Engine
              </span>
              <h3 className="text-xl font-serif font-bold text-[#1B2B1F]">
                Reconciling Land Data
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Progress Indicator Card */}
          <div className="bg-[#1B2B1F] text-white rounded-2xl p-5 shadow-sm border border-[#2D4632]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#BDC9BF]">
                Overall Pipeline Progress
              </span>
              <span className="text-2xl font-serif font-bold text-white font-mono">
                {progress}% COMPLETE
              </span>
            </div>

            <div className="w-full h-3 bg-[#2D4632] rounded-full overflow-hidden p-0.5 border border-[#3A5A40]/40">
              <div 
                className="h-full bg-[#3A5A40] rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-[#BDC9BF]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D9A05B] animate-ping"></span>
                Processing: Stage 5 of 7 (Conflict Resolution)
              </span>
              <span className="font-mono text-[#A3A9A5]">ETA: ~12s</span>
            </div>
          </div>

          {/* Live Statistics Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5E6660]">Live Statistics</span>
              <span className="text-[11px] font-bold text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/50">
                Ward 112 • Pilot Zone
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-[#FAF9F6] border border-[#E8E6E1] p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Buildings Processed</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F]">{processedCount} / 1,248</span>
              </div>

              <div className="bg-[#EAF2EA] border border-[#BDC9BF]/60 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#4A7C44] block">Matched & Verified</span>
                <span className="text-base font-serif font-bold text-[#3A5A40]">{matchedCount}</span>
              </div>

              <div className="bg-[#FAF9F6] border border-[#E8E6E1] p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Average Confidence</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F]">{avgConfidence}%</span>
              </div>

              <div className="bg-[#FFF9F0] border border-[#F3E1C6] p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#B07D3E] block">Conflicts Detected</span>
                <span className="text-base font-serif font-bold text-[#B07D3E]">{conflictsDetected}</span>
              </div>

              <div className="bg-[#EAF2EA] border border-[#BDC9BF]/60 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#4A7C44] block">Auto-Resolved</span>
                <span className="text-base font-serif font-bold text-[#4A7C44]">{autoResolved}</span>
              </div>

              <div className="bg-[#FDF2F0] border border-[#F8D7DA] p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#D66D54] block">Requires Review</span>
                <span className="text-base font-serif font-bold text-[#D66D54]">{requiresReview}</span>
              </div>
            </div>
          </div>

          {/* Pipeline Stage Checklist */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5E6660] block mb-2">
              Harmonization Stages
            </span>

            <div className="space-y-2">
              {pipelineStages.map((stage) => {
                const isDone = progress >= stage.defaultDoneAt;
                const isCurrent = !isDone && (progress >= stage.defaultDoneAt - 15);

                return (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      isDone
                        ? 'bg-[#EAF2EA]/60 border-[#BDC9BF] text-[#1B2B1F]'
                        : isCurrent
                        ? 'bg-[#FFF9F0] border-[#D9A05B] text-[#1B2B1F] ring-2 ring-[#D9A05B]/20'
                        : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#A3A9A5]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-[#3A5A40]" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#B07D3E] animate-spin" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E8E6E1]" />
                        )}
                      </div>
                      <div>
                        <span className={`font-bold ${isDone ? 'text-[#1B2B1F]' : isCurrent ? 'text-[#1B2B1F] font-bold' : 'text-[#5E6660]'}`}>
                          {stage.title}
                        </span>
                        <span className="text-[10px] text-[#5E6660] block">
                          {stage.subtitle}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold">
                      {isDone ? "✓ Done" : isCurrent ? "Processing..." : "Queued"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="text-xs text-[#5E6660]">
            {progress < 100 ? "Reconciliation in progress..." : "Reconciliation finished successfully!"}
          </div>

          <div className="flex items-center gap-2">
            {progress < 100 && (
              <button
                onClick={() => setProgress(100)}
                className="px-3.5 py-2 text-xs font-semibold text-[#5E6660] hover:text-[#1B2B1F] transition"
              >
                Fast-Forward
              </button>
            )}

            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <span>{progress === 100 ? "Apply Results & View Map" : "Complete & View"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
