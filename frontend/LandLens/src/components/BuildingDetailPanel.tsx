import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  Ruler, 
  Cpu, 
  Check, 
  Eye, 
  Split,
  Loader2,
  HelpCircle,
  Tag,
  Copy
} from 'lucide-react';
import { CanonicalEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { api } from '../services/api';

interface BuildingDetailPanelProps {
  building: CanonicalEntity | null;
  onClose: () => void;
  language: Language;
  onViewSources: () => void;
  onBuildingUpdated?: (updated: CanonicalEntity) => void;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  building,
  onClose,
  language,
  onViewSources,
  onBuildingUpdated,
}) => {
  const t = translations[language] || {
    confidence: "Confidence Score",
    area: "Reconciled Area",
    sources: "Data Sources",
    reconciled: "Reconciled",
    reviewRequired: "Review Required",
  };

  const [detailedEntity, setDetailedEntity] = useState<CanonicalEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [copiedBhu, setCopiedBhu] = useState(false);

  const handleCopyBhu = (text: string) => {
    // Normalizes to clean, standard ASCII characters (removes any math-bold/stylized unicode font issues)
    const clean = text.normalize('NFKD').trim();
    navigator.clipboard.writeText(clean);
    setCopiedBhu(true);
    setTimeout(() => setCopiedBhu(false), 2000);
  };

  // Fetch full details (score breakdown) when building changes
  useEffect(() => {
    if (!building) {
      setDetailedEntity(null);
      return;
    }

    setDetailedEntity(building);
    setLoading(true);

    api.getEntityDetail(building.canonical_uid)
      .then((data) => {
        setDetailedEntity(data);
      })
      .catch((err) => {
        console.warn('Could not fetch full entity detail:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [building?.canonical_uid]);

  const handleResolve = async () => {
    if (!detailedEntity) return;
    setResolving(true);
    try {
      await api.resolveReview(detailedEntity.canonical_uid);
      const updated: CanonicalEntity = {
        ...detailedEntity,
        needs_review: false,
      };
      setDetailedEntity(updated);
      if (onBuildingUpdated) onBuildingUpdated(updated);
    } catch (e) {
      console.error('Failed to resolve review:', e);
    } finally {
      setResolving(false);
    }
  };

  if (!building) {
    return (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center text-[#5E6660]">
        <div className="w-14 h-14 rounded-2xl bg-[#F1F3F0] flex items-center justify-center text-[#A3A9A5] mb-3">
          <Layers className="w-7 h-7 text-[#3A5A40]" />
        </div>
        <h3 className="font-serif font-bold text-lg text-[#1B2B1F] mb-1">No Parcel Selected</h3>
        <p className="text-xs max-w-xs text-[#5E6660]">
          Click on any building footprint on the map to inspect its reconciliation breakdown, matching metrics, and contributing sources.
        </p>
      </div>
    );
  }

  const current = detailedEntity || building;
  const isReview = current.needs_review;
  const confPercent = Math.round(current.confidence_score * 100);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between bg-[#FAF9F6]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EAF2EA] text-[#3A5A40] flex items-center justify-center font-bold text-xs">
            UID
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-[#1B2B1F] truncate max-w-[200px]">
              {current.canonical_uid}
            </h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
              isReview 
                ? 'bg-[#FFF9F0] text-[#B07D3E] border border-[#FDEACD]' 
                : 'bg-[#EAF2EA] text-[#4A7C44] border border-[#BDC9BF]'
            }`}>
              {isReview ? '⚠️ Needs Review' : '✓ Reconciled'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Bhu-Aadhar (ULPIN) Card */}
        <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#BDC9BF] space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3A5A40]"></span>
              <span className="text-[11px] font-bold text-[#1B2B1F] uppercase tracking-wider">
                Bhu-Aadhar (ULPIN)
              </span>
            </div>
            <span className="text-[9px] bg-[#3A5A40]/10 text-[#3A5A40] font-bold px-2 py-0.5 rounded-md border border-[#3A5A40]/20">
              DoLR NAKSHA Compliant
            </span>
          </div>
          <div className="font-mono text-sm font-black text-[#1B2B1F] tracking-wider bg-white p-2.5 rounded-xl border border-[#E8E6E1] flex items-center justify-between shadow-2xs">
            <div className="flex flex-col">
              <span className="select-all font-mono font-bold text-sm tracking-wider text-[#1B2B1F]">
                {current.bhu_aadhar || current.canonical_uid.slice(0, 14)}
              </span>
              <span className="text-[9px] text-[#5E6660] font-sans font-medium">14-Digit Official Bhu-Aadhar</span>
            </div>
            <button
              onClick={() => handleCopyBhu(current.bhu_aadhar || current.canonical_uid.slice(0, 14))}
              className={`px-2.5 py-1 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                copiedBhu
                  ? 'bg-[#EAF2EA] text-[#4A7C44] border border-[#BDC9BF]'
                  : 'bg-[#F8F9F8] hover:bg-[#EAF2EA] text-[#1B2B1F] border border-[#E8E6E1]'
              }`}
              title="Copy pure ASCII Bhu-Aadhar to clipboard"
            >
              {copiedBhu ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4A7C44]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#5E6660]" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="text-[10px] text-[#5E6660] grid grid-cols-2 gap-1 pt-0.5 border-t border-[#E8E6E1]">
            <div>State Code: <b className="text-[#1B2B1F]">29 (Karnataka)</b></div>
            <div>District Code: <b className="text-[#1B2B1F]">20 (Bengaluru Urban)</b></div>
          </div>
        </div>

        {/* Confidence Score Card */}
        <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#E8E6E1] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5E6660]">
            <span>Reconciliation Confidence</span>
            <span className={`font-bold ${isReview ? 'text-[#B07D3E]' : 'text-[#3A5A40]'}`}>
              {confPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-[#E8E6E1] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isReview ? 'bg-[#D9A05B]' : 'bg-[#3A5A40]'
              }`}
              style={{ width: `${confPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-[#5E6660]">
            Calculated via weighted spatial IoU overlap, centroid distance, and source reliability weighting.
          </p>
        </div>

        {/* 3D Elevation & Physical Height (Copernicus DSM & FABDEM DTM) */}
        <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#BDC9BF] space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3A5A40]"></span>
              <span className="text-[11px] font-bold text-[#1B2B1F] uppercase tracking-wider">
                3D Elevation & Structure
              </span>
            </div>
            <span className="text-[9px] bg-[#3A5A40]/10 text-[#3A5A40] font-bold px-2 py-0.5 rounded-md border border-[#3A5A40]/20">
              Copernicus + FABDEM
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded-xl border border-[#E8E6E1]">
              <div className="text-[10px] text-[#5E6660] font-medium">Physical Height (nDSM)</div>
              <div className="text-base font-bold text-[#1B2B1F] mt-0.5 flex items-baseline gap-1">
                <span>{current.height_m != null ? `${current.height_m} m` : 'N/A'}</span>
                {current.estimated_floors && (
                  <span className="text-xs font-semibold text-[#4A7C44]">
                    ({current.estimated_floors} {current.estimated_floors === 1 ? 'Floor' : 'Floors'})
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-[#E8E6E1]">
              <div className="text-[10px] text-[#5E6660] font-medium">Rooftop MSL (DSM)</div>
              <div className="text-base font-bold text-[#1B2B1F] mt-0.5">
                {current.elevation_roof_m != null ? `${current.elevation_roof_m} m` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#5E6660] flex items-center justify-between pt-1 border-t border-[#E8E6E1]">
            <div>Bare-Earth Ground: <b className="text-[#1B2B1F]">{current.elevation_ground_m != null ? `${current.elevation_ground_m} m MSL` : 'N/A'}</b></div>
            <div className="text-[#3A5A40] font-semibold">30m Native Grid</div>
          </div>
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-xl border border-[#E8E6E1]">
            <div className="text-[10px] font-semibold text-[#5E6660] uppercase tracking-wider">
              Reconciled Area
            </div>
            <div className="text-base font-bold text-[#1B2B1F] mt-0.5">
              {current.area_m2 ? `${Math.round(current.area_m2)} m²` : 'N/A'}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E8E6E1]">
            <div className="text-[10px] font-semibold text-[#5E6660] uppercase tracking-wider">
              Source Agreement
            </div>
            <div className="text-base font-bold text-[#1B2B1F] mt-0.5">
              {current.source_count} {current.source_count === 1 ? 'Source' : 'Sources'}
            </div>
          </div>
        </div>

        {/* Contributing Sources */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#1B2B1F]">Contributing Data Sources</div>
          <div className="flex flex-wrap gap-1.5">
            {current.sources.map((src, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EAF2EA] text-[#2D4632] border border-[#BDC9BF]/60 flex items-center gap-1"
              >
                <Tag className="w-3 h-3 text-[#3A5A40]" />
                {src.toUpperCase().replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Technical Match Breakdown */}
        <div className="border border-[#E8E6E1] rounded-2xl p-3.5 space-y-2.5 bg-white">
          <div className="text-xs font-bold text-[#1B2B1F] flex items-center justify-between">
            <span>Spatial Match Breakdown</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3A5A40]" />}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#F1F3F0]">
              <span className="text-[#5E6660]">Avg Match Quality:</span>
              <span className="font-semibold text-[#1B2B1F]">
                {current.avg_match_score !== null && current.avg_match_score !== undefined
                  ? `${(current.avg_match_score * 100).toFixed(1)}%`
                  : 'Single Source (Unmatched)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#F1F3F0]">
              <span className="text-[#5E6660]">IoU Geometric Agreement:</span>
              <span className="font-semibold text-[#1B2B1F]">
                {current.avg_iou_agreement !== null && current.avg_iou_agreement !== undefined
                  ? `${(current.avg_iou_agreement * 100).toFixed(1)}%`
                  : 'N/A (Single Source)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[#5E6660]">Member Features:</span>
              <span className="font-semibold text-[#1B2B1F]">
                {current.member_feature_ids ? current.member_feature_ids.length : current.source_count} raw polygons
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onViewSources}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#3A5A40] text-white text-xs font-bold hover:bg-[#2D4632] transition shadow-xs active:scale-98"
          >
            <Split className="w-4 h-4" />
            <span>Compare Source Footprints</span>
          </button>

          {isReview && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#BDC9BF] bg-[#EAF2EA] text-[#2D4632] text-xs font-bold hover:bg-[#d8e8d8] transition active:scale-98 disabled:opacity-50"
            >
              {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-[#3A5A40]" />}
              <span>Mark as Verified / Accept</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
