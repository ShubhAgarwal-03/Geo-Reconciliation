import React, { useState } from 'react';
import { 
  BuildingEntity, 
  Language 
} from '../types';
import { translations } from '../data/i18n';
import { 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  MapPin, 
  Eye, 
  Layers, 
  Ruler, 
  Check, 
  X, 
  Edit3, 
  Compass, 
  Send,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReviewQueueViewProps {
  buildings: BuildingEntity[];
  onSelectBuildingOnMap: (building: BuildingEntity) => void;
  language: Language;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  buildings,
  onSelectBuildingOnMap,
  language,
}) => {
  const t = translations[language];

  // Filter only buildings that have conflict or review status
  const reviewItems = buildings.filter(b => b.status === 'conflict' || b.status === 'review');

  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviewBuilding, setSelectedReviewBuilding] = useState<BuildingEntity | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

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

  const handleAction = (actionType: 'accept' | 'source' | 'edit' | 'field') => {
    if (!selectedReviewBuilding) return;

    let msg = "";
    if (actionType === 'accept') {
      msg = `Accepted AI recommendation (${selectedReviewBuilding.conflictDetails?.recommendedArea || selectedReviewBuilding.area} m²) for ${selectedReviewBuilding.id}!`;
      try {
        confetti({ particleCount: 40, spread: 50 });
      } catch (e) {}
    } else if (actionType === 'source') {
      msg = `Set active geometry from ${chosenSource.toUpperCase()} for ${selectedReviewBuilding.id}`;
    } else if (actionType === 'edit') {
      msg = `Opened vertex geometry editor for ${selectedReviewBuilding.id}`;
    } else if (actionType === 'field') {
      msg = `Task dispatched to Zonal Field Inspector with GNSS RTK Rover for ${selectedReviewBuilding.id}`;
    }

    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setSelectedReviewBuilding(null);
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
              37 cases
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
              All (37)
            </button>
            <button
              onClick={() => setActiveTab('high')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'high' ? 'bg-[#D66D54] text-white shadow-2xs' : 'text-[#D66D54] hover:bg-[#FDF2F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D66D54]"></span>
              High Conflict (11)
            </button>
            <button
              onClick={() => setActiveTab('medium')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'medium' ? 'bg-[#B07D3E] text-white shadow-2xs' : 'text-[#B07D3E] hover:bg-[#FFF9F0]'}`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D9A05B]"></span>
              Medium (26)
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
                className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
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
                  {selectedReviewBuilding.conflictDetails?.technicalReason || "IoU variance 0.74, centroid offset 2.3m."}
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
                      <span className="text-[10px] bg-white border border-[#E8E6E1] text-[#5E6660] px-2 py-0.5 rounded-full font-mono">
                        3-4 Inconsistent Outlines
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
                  </div>

                  {/* SVG mini overlay illustration */}
                  <div className="h-32 bg-white rounded-xl mt-3 flex items-center justify-center relative overflow-hidden border border-[#E8E6E1]">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      {/* Cadastral */}
                      <rect x="20" y="20" width="60" height="60" fill="none" stroke="#7D6D8A" strokeWidth="2" strokeDasharray="3,2" />
                      {/* Municipal */}
                      <rect x="16" y="24" width="68" height="56" fill="none" stroke="#4A6D7C" strokeWidth="2" />
                      {/* AI */}
                      <rect x="22" y="22" width="58" height="58" fill="none" stroke="#3A5A40" strokeWidth="1.5" />
                    </svg>
                    <span className="absolute bottom-2 text-[10px] text-[#5E6660] font-mono">
                      Max boundary offset: 2.3m
                    </span>
                  </div>
                </div>

                {/* RIGHT: Reconciled Geometry */}
                <div className="bg-[#EAF2EA] text-[#1B2B1F] rounded-2xl p-4 border border-[#BDC9BF] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#BDC9BF]/60 mb-3">
                      <span className="text-xs font-bold text-[#3A5A40] uppercase tracking-wider">
                        RIGHT: Reconciled Geometry
                      </span>
                      <span className="text-[10px] bg-white border border-[#BDC9BF] text-[#4A7C44] px-2 py-0.5 rounded-full font-bold">
                        AI Recommended
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

                    <p className="text-xs text-[#5E6660] leading-relaxed">
                      Removes roof eave overhang from Municipal tax footprint, aligning strictly with Revenue Cadastral legal corner markers and 5cm Drone ground truth.
                    </p>
                  </div>

                  {/* SVG mini reconciled illustration */}
                  <div className="h-32 bg-white rounded-xl mt-3 flex items-center justify-center relative overflow-hidden border border-[#BDC9BF]">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <rect x="21" y="21" width="58" height="58" fill="#3A5A40" fillOpacity="0.2" stroke="#3A5A40" strokeWidth="2.5" />
                      <circle cx="50" cy="50" r="3" fill="#3A5A40" />
                    </svg>
                    <span className="absolute bottom-2 text-[10px] text-[#4A7C44] font-mono font-semibold">
                      Consensus boundary normalized
                    </span>
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
                  className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Recommendation</span>
                </button>

                <button
                  onClick={() => handleAction('source')}
                  className="px-3.5 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Select Source</span>
                </button>

                <button
                  onClick={() => handleAction('edit')}
                  className="px-3.5 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Geometry</span>
                </button>

                <button
                  onClick={() => handleAction('field')}
                  className="px-3.5 py-2 bg-[#FFF9F0] hover:bg-[#FDF2F0] text-[#B07D3E] border border-[#F3E1C6] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
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
