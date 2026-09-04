import React, { useState } from 'react';
import { 
  BuildingEntity, 
  BuildingStatus,
  Language 
} from '../types';
import { translations } from '../data/i18n';
import { 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  MapPin, 
  Eye, 
  Layers, 
  Check, 
  X, 
  Edit3, 
  Send,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { resolveEntity } from '../api/geoReconciliationClient';

interface ReviewQueueViewProps {
  buildings: BuildingEntity[];
  onSelectBuildingOnMap: (building: BuildingEntity) => void;
  language: Language;
  // Called after a real PATCH /entities/{id}/resolve succeeds, so the parent
  // can update its local `buildings` state the same way handleApprove /
  // handleReject already do in App.tsx. Pass App.tsx's `updateBuildingStatus`
  // here.
  onResolved: (id: string, status: BuildingStatus) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  buildings,
  onSelectBuildingOnMap,
  language,
  onResolved,
}) => {
  const t = translations[language];

  // Filter only buildings that have conflict or review status
  const reviewItems = buildings.filter(b => b.status === 'conflict' || b.status === 'review');
  const highCount = reviewItems.filter(b => b.status === 'conflict').length;
  const mediumCount = reviewItems.filter(b => b.status === 'review').length;

  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviewBuilding, setSelectedReviewBuilding] = useState<BuildingEntity | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected source option if operator wants to override
  const [chosenSource, setChosenSource] = useState<string>('recommendation');

  const filteredItems = reviewItems.filter(b => {
    if (activeTab === 'high' && b.status !== 'conflict') return false;
    if (activeTab === 'medium' && b.status !== 'review') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.surveyNumber.toLowerCase().includes(q) || b.landUse.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAction = async (actionType: 'accept' | 'source' | 'edit' | 'field') => {
    if (!selectedReviewBuilding) return;
    const id = selectedReviewBuilding.id;

    // "Edit Geometry" and "Mark for Field Verification" have no backend
    // support at all right now — PATCH /entities/{id}/resolve only accepts
    // status + a free-text note. Faking success for these would just move
    // the placeholder problem here instead of fixing it, so they stay
    // clearly labeled as not-yet-implemented rather than pretending to work.
    if (actionType === 'edit') {
      setActionSuccessMessage('Geometry editor is not implemented yet — no backend endpoint exists for it.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      return;
    }
    if (actionType === 'field') {
      setActionSuccessMessage('Field verification dispatch is not implemented yet — no backend endpoint exists for it.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionType === 'accept') {
        await resolveEntity(id, { status: 'approved' });
        onResolved(id, 'reconciled');
        setActionSuccessMessage(
          `Accepted recommendation for ${id} (${selectedReviewBuilding.conflictDetails?.recommendedArea || selectedReviewBuilding.area} m²)`
        );
        try {
          confetti({ particleCount: 40, spread: 50 });
        } catch (e) {
          // non-critical decoration; ignore if canvas-confetti fails silently
        }
      } else if (actionType === 'source') {
        // The backend has no dedicated "use this source's geometry" endpoint —
        // resolve only takes status + note. Recording the chosen source in
        // `note` is the closest honest mapping onto what actually exists.
        await resolveEntity(id, { status: 'edited', note: `source_override:${chosenSource}` });
        onResolved(id, 'reconciled');
        setActionSuccessMessage(`Recorded source override (${chosenSource}) for ${id}`);
      }
      setSelectedReviewBuilding(null);
    } catch (e) {
      console.error(`Failed to resolve entity ${id}`, e);
      setActionSuccessMessage(null);
      alert(e instanceof Error ? e.message : 'Failed to resolve entity');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">
              {t.reviewRequired}
            </h2>
            <span className="text-[11px] font-bold bg-[#FFF9F0] text-[#B07D3E] border border-[#F3E1C6] px-3 py-0.5 rounded-full">
              {reviewItems.length} cases
            </span>
          </div>
          <p className="text-sm text-[#5E6660] mt-1">
            Human-in-the-loop review queue for parcels with multi-source boundary divergence below 90% confidence.
          </p>
        </div>

        {/* Search & Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-[#F1F3F0] p-1 rounded-xl flex text-xs font-bold border border-[#E8E6E1]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'all' ? 'bg-white text-[#1B2B1F] shadow-2xs' : 'text-[#5E6660] hover:text-[#1B2B1F]'}`}
            >
              All ({reviewItems.length})
            </button>
            <button
              onClick={() => setActiveTab('high')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'high' ? 'bg-[#D66D54] text-white shadow-2xs' : 'text-[#D66D54] hover:bg-[#FDF2F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D66D54]"></span>
              High Conflict ({highCount})
            </button>
            <button
              onClick={() => setActiveTab('medium')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'medium' ? 'bg-[#B07D3E] text-white shadow-2xs' : 'text-[#B07D3E] hover:bg-[#FFF9F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D9A05B]"></span>
              Medium ({mediumCount})
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-[#1B2B1F] font-semibold text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#3A5A40]" />
            <span>{actionSuccessMessage}</span>
          </div>
          <span className="text-[11px] text-[#4A7C44] bg-white px-2 py-0.5 rounded-md font-bold border border-[#BDC9BF]/50">
            Record Updated
          </span>
        </div>
      )}

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((building) => {
          const isHigh = building.status === 'conflict';
          const conf = building.confidence;

          return (
            <div
              key={building.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                isHigh ? 'border-[#F8D7DA] hover:border-[#D66D54]' : 'border-[#F3E1C6] hover:border-[#D9A05B]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isHigh ? 'bg-[#FDF2F0] text-[#D66D54] border border-[#F8D7DA]' : 'bg-[#FFF9F0] text-[#B07D3E] border border-[#F3E1C6]'
                  }`}>
                    {isHigh ? (
                      <>
                        <AlertOctagon className="w-3 h-3 text-[#D66D54]" />
                        <span>HIGH CONFLICT</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-[#B07D3E]" />
                        <span>MEDIUM CONFLICT</span>
                      </>
                    )}
                  </span>

                  <span className="text-xs font-mono font-bold text-[#5E6660]">
                    Survey #{building.surveyNumber}
                  </span>
                </div>

                <h3 className="text-base font-serif font-bold text-[#1B2B1F]">
                  Building #{building.id}
                </h3>
                <p className="text-xs text-[#5E6660] mt-0.5">
                  {building.wardNo} • {building.landUse} ({building.area} m²)
                </p>

                <div className="my-3 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs text-[#2D312E]">
                  <span className="font-semibold block text-[#1B2B1F]">
                    {building.conflictDetails?.title || "Geometry variance detected"}
                  </span>
                  <p className="text-[11px] text-[#5E6660] mt-1 line-clamp-2">
                    {building.conflictDetails?.simplifiedReason || "Sources differ significantly across municipal and revenue boundaries."}
                  </p>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-[11px] font-semibold text-[#5E6660]">
                    <span>Confidence</span>
                    <span className={`font-mono font-bold ${isHigh ? 'text-[#D66D54]' : 'text-[#B07D3E]'}`}>
                      {conf}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F3F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHigh ? 'bg-[#D66D54]' : 'bg-[#D9A05B]'}`}
                      style={{ width: `${conf}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F3F0]">
                <button
                  onClick={() => onSelectBuildingOnMap(building)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View on Map</span>
                </button>

                <button
                  onClick={() => setSelectedReviewBuilding(building)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-white rounded-xl text-xs font-bold transition shadow-xs ${
                    isHigh ? 'bg-[#D66D54] hover:bg-[#B8533D]' : 'bg-[#B07D3E] hover:bg-[#8F632D]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Review Detail Split-Screen Modal */}
      {selectedReviewBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                  selectedReviewBuilding.status === 'conflict' ? 'bg-[#D66D54]' : 'bg-[#B07D3E]'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D66D54]">
                      Conflict Detected
                    </span>
                    <span className="text-xs text-[#5E6660] font-mono">
                      Survey #{selectedReviewBuilding.surveyNumber}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#1B2B1F]">
                    Review Building #{selectedReviewBuilding.id}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedReviewBuilding(null)}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Conflict Explanation Banner */}
              <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#F3E1C6] text-xs text-[#2D312E]">
                <span className="font-bold text-sm block mb-1 text-[#1B2B1F]">Reason for Flag:</span>
                <p className="leading-relaxed font-medium text-[#5E6660]">
                  {selectedReviewBuilding.conflictDetails?.simplifiedReason || "Building boundaries differ between cadastral and municipal sources."}
                </p>
                <div className="mt-2 text-[11px] text-[#8F632D] font-mono bg-white/80 p-2 rounded-lg border border-[#F3E1C6]/60">
                  {selectedReviewBuilding.conflictDetails?.technicalReason || "No per-entity technical breakdown available from the backend yet."}
                </div>
              </div>

              {/* The Split Screen Maps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* LEFT: Source Geometries */}
                <div className="bg-[#FAF9F6] text-[#2D312E] rounded-2xl p-4 border border-[#E8E6E1] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8E6E1] mb-3">
                      <span className="text-xs font-bold text-[#D66D54] uppercase tracking-wider">
                        LEFT: Source Geometries
                      </span>
                    </div>

                    {/* Source Values Table */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E6E1]">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#7D6D8A]"></span>
                          <span className="font-semibold text-[#2D312E]">Cadastral Map:</span>
                        </div>
                        <span className="font-mono font-bold text-[#1B2B1F]">{selectedReviewBuilding.sources.cadastral.area} m²</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E6E1]">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#4A6D7C]"></span>
                          <span className="font-semibold text-[#2D312E]">Municipal GIS:</span>
                        </div>
                        <span className="font-mono font-bold text-[#1B2B1F]">{selectedReviewBuilding.sources.municipal.area} m²</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E6E1]">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#3A5A40]"></span>
                          <span className="font-semibold text-[#2D312E]">AI Extraction:</span>
                        </div>
                        <span className="font-mono font-bold text-[#1B2B1F]">{selectedReviewBuilding.sources.ai.area} m²</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E6E1]">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#D9A05B]"></span>
                          <span className="font-semibold text-[#2D312E]">Drone ORI:</span>
                        </div>
                        <span className="font-mono font-bold text-[#1B2B1F]">{selectedReviewBuilding.sources.ori.area} m²</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#A3A9A5] mt-2 leading-snug">
                      Note: the backend doesn't yet return separate per-source polygons — present sources currently reuse the reconciled area figure. See adapter.ts.
                    </p>
                  </div>
                </div>

                {/* RIGHT: Reconciled Geometry */}
                <div className="bg-[#EAF2EA] text-[#1B2B1F] rounded-2xl p-4 border border-[#BDC9BF] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#BDC9BF]/60 mb-3">
                      <span className="text-xs font-bold text-[#3A5A40] uppercase tracking-wider">
                        RIGHT: Reconciled Geometry
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#BDC9BF] text-xs mb-3 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-[#4A7C44] block">System Recommendation</span>
                      <div className="text-2xl font-serif font-bold text-[#1B2B1F] my-1">
                        {selectedReviewBuilding.conflictDetails?.recommendedArea || selectedReviewBuilding.area} m²
                      </div>
                      <div className="flex items-center justify-between text-[#5E6660] text-[11px]">
                        <span>Calculated Confidence</span>
                        <span className="font-mono font-bold text-[#3A5A40]">
                          {selectedReviewBuilding.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Human-in-the-Loop Action Buttons */}
            <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#5E6660] font-semibold">
                Human-in-the-Loop Actions:
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAction('accept')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Accept Recommendation</span>
                </button>

                <button
                  onClick={() => handleAction('source')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Select Source ({chosenSource})</span>
                </button>

                <button
                  onClick={() => handleAction('edit')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Not implemented — no backend endpoint exists yet"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Geometry</span>
                </button>

                <button
                  onClick={() => handleAction('field')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-[#FFF9F0] hover:bg-[#FDF2F0] text-[#B07D3E] border border-[#F3E1C6] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Not implemented — no backend endpoint exists yet"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mark for Field Verification</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};