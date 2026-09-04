import React, { useState } from 'react';
import { 
  BuildingEntity, 
  Language 
} from '../types';
import { translations } from '../data/i18n';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Layers, 
  History, 
  FileCode, 
  BadgeCheck, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info,
  ChevronRight,
  Ruler,
  Maximize2
} from 'lucide-react';

interface BuildingDetailPanelProps {
  building: BuildingEntity | null;
  onClose: () => void;
  language: Language;
  onViewSources: () => void;
  onViewHistory?: () => void;
  onOpenHistory?: () => void;
  onViewTechnical?: () => void;
  onOpenTechnicalDetails?: () => void;
  onViewDigitalCard?: () => void;
  onOpenDigitalCard?: () => void;
  onOpenReconcile?: () => void;
  onApprove?: (buildingId: string) => void;
  onReject?: (buildingId: string) => void;
  isResolving?: boolean;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  building,
  onClose,
  language,
  onViewSources,
  onViewHistory,
  onOpenHistory,
  onViewTechnical,
  onOpenTechnicalDetails,
  onViewDigitalCard,
  onOpenDigitalCard,
  onOpenReconcile,
  onApprove,
  onReject,
  isResolving,
}) => {
  const t = translations[language];

  const handleHistory = () => {
    if (onOpenHistory) onOpenHistory();
    else if (onViewHistory) onViewHistory();
  };

  const handleTechnical = () => {
    if (onOpenTechnicalDetails) onOpenTechnicalDetails();
    else if (onViewTechnical) onViewTechnical();
  };

  const handleDigitalCard = () => {
    if (onOpenDigitalCard) onOpenDigitalCard();
    else if (onViewDigitalCard) onViewDigitalCard();
  };

  if (!building) {
    return (
      <div className="w-full lg:w-96 bg-white border-l border-[#E8E6E1] flex flex-col h-full items-center justify-center p-6 text-center text-[#5E6660]">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F3F0] flex items-center justify-center text-[#A3A9A5] mb-3">
          <Layers className="w-6 h-6 text-[#3A5A40]" />
        </div>
        <h3 className="font-serif font-bold text-lg text-[#1B2B1F] mb-1">No Entity Selected</h3>
        <p className="text-xs max-w-xs text-[#5E6660]">Click on any parcel or building on the map to view source divergences and verification records.</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (building.status) {
      case 'reconciled':
        return (
          <span className="px-2.5 py-1 bg-[#EAF2EA] text-[#4A7C44] text-[10px] font-bold rounded-md border border-[#BDC9BF]/50">
            ✓ RECONCILED
          </span>
        );
      case 'review':
        return (
          <span className="px-2.5 py-1 bg-[#FFF9F0] text-[#B07D3E] text-[10px] font-bold rounded-md border border-[#FDEACD]">
            ⚠️ REVIEW
          </span>
        );
      case 'conflict':
        return (
          <span className="px-2.5 py-1 bg-[#FDF2F0] text-[#D66D54] text-[10px] font-bold rounded-md border border-[#F8D7DA]">
            🔴 CONFLICT
          </span>
        );
    }
  };

  return (
    <div className="w-full lg:w-96 bg-white border-l border-[#E8E6E1] flex flex-col h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      
      {/* Header */}
      <div className="p-5 border-b border-[#F1F3F0] sticky top-0 bg-white/95 backdrop-blur-xs z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider">Selected Entity</p>
            <h3 className="text-xl font-serif font-bold text-[#1B2B1F] flex items-center gap-2">
              <span>{building.id}</span>
            </h3>
            <div className="text-xs text-[#5E6660] font-medium mt-0.5">
              Survey No: <span className="font-bold text-[#1B2B1F]">{building.surveyNumber}</span> • {building.wardNo}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDigitalCard}
              className="text-[11px] font-bold text-[#3A5A40] hover:text-[#1B2B1F] flex items-center gap-1 bg-[#EAF2EA] hover:bg-[#D6E0D8] px-2.5 py-1 rounded-lg border border-[#BDC9BF] transition"
              title="Official Digital Land Entity Card"
            >
              <BadgeCheck className="w-3.5 h-3.5 text-[#4A7C44]" />
              <span>Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#F1F3F0] text-[#A3A9A5] hover:text-[#1B2B1F] transition"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>{getStatusBadge()}</div>
          <span className="text-xs text-[#5E6660] font-medium">
            Agreement: <strong className="text-[#1B2B1F]">{building.agreementScore}%</strong>
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-5 flex-1">
        
        {/* Core Attributes Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F8F9F8] p-3 rounded-xl border border-[#E8E6E1]/80">
            <p className="text-[10px] text-[#5E6660] font-semibold uppercase">{t.area}</p>
            <p className="text-lg font-bold text-[#1B2B1F] mt-0.5">{building.area} m²</p>
            <span className="text-[10px] text-[#A3A9A5] block">Unified Footprint</span>
          </div>

          <div className="bg-[#F8F9F8] p-3 rounded-xl border border-[#E8E6E1]/80">
            <p className="text-[10px] text-[#5E6660] font-semibold uppercase">{t.confidence}</p>
            <p className="text-lg font-bold text-[#4A7C44] mt-0.5">{building.confidence}%</p>
            <span className="text-[10px] text-[#A3A9A5] block">
              {building.floors != null ? `${building.floors} Floors` : 'Floors: N/A'} • {building.height != null ? `${building.height}m` : 'Height: N/A'}
            </span>
          </div>
        </div>

        {/* Source Divergence List matching Natural Tones design */}
        <div className="space-y-2 bg-white rounded-2xl p-3.5 border border-[#E8E6E1]">
          <div className="flex items-center justify-between pb-1 border-b border-[#F1F3F0]">
            <p className="text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider">Source Divergence</p>
            <span className="text-[10px] font-bold text-[#3A5A40] bg-[#EAF2EA] px-2 py-0.5 rounded-full">
              {building.sourcesCount} {building.sourcesCount === 1 ? 'Source' : 'Sources'}
            </span>
          </div>

          <div className="divide-y divide-[#F1F3F0] text-xs">
            <div className="flex justify-between py-2">
              <span className="text-[#5E6660] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D9A05B]"></span>
                Drone (ORI)
              </span>
              <span className="font-mono font-bold text-[#1B2B1F]">{building.sources.ori.area} m²</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5E6660] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3A5A40]"></span>
                Municipal GIS
              </span>
              <span className="font-mono font-bold text-[#1B2B1F]">{building.sources.municipal.area} m²</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5E6660] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4A7C44]"></span>
                Cadastral
              </span>
              <span className="font-mono font-bold text-[#1B2B1F]">{building.sources.cadastral.area} m²</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5E6660] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B07D3E]"></span>
                AI Extraction
              </span>
              <span className="font-mono font-bold text-[#1B2B1F]">{building.sources.ai.area} m²</span>
            </div>
          </div>
        </div>

        {/* Match Probability Progress Bar */}
        <div className="bg-[#F8F9F8] p-3.5 rounded-2xl border border-[#E8E6E1]">
          <div className="flex justify-between text-[10px] font-bold text-[#1B2B1F] mb-1.5">
            <span className="uppercase tracking-wider">MATCH PROBABILITY</span>
            <span className="font-mono text-[#4A7C44]">{building.confidence}%</span>
          </div>
          <div className="h-2 w-full bg-[#F1F3F0] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#3A5A40] transition-all duration-500 rounded-full" 
              style={{ width: `${building.confidence}%` }}
            />
          </div>
          <p className="text-[10px] text-[#4A7C44] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#4A7C44]" />
            <span>Geometry aligned across {building.sourcesCount} {building.sourcesCount === 1 ? 'dataset' : 'datasets'}</span>
          </p>
        </div>

        {/* Conflict Details Alert if Present */}
        {building.conflictDetails && (
          <div className={`p-3.5 rounded-2xl border text-xs ${
            building.conflictDetails.severity === 'high' 
              ? 'bg-[#FDF2F0] border-[#F8D7DA] text-[#902A1A]' 
              : 'bg-[#FFF9F0] border-[#FDEACD] text-[#B07D3E]'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{building.conflictDetails.title}</span>
            </div>
            <p className="text-[#5E6660] leading-relaxed mb-2">
              {building.conflictDetails.simplifiedReason}
            </p>
            <div className="font-semibold text-[#1B2B1F] bg-white/80 p-2 rounded-lg border border-[#E8E6E1]">
              Recommended Boundary: {building.conflictDetails.recommendedArea} m²
            </div>
          </div>
        )}

        {/* Verification Checklist */}
        <div className="space-y-1.5 pt-1 text-xs text-[#5E6660]">
          <p className="text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider mb-2">Consensus Checks</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 ${building.verificationChecks.geometryAgreement ? 'text-[#4A7C44]' : 'text-[#A3A9A5]'}`} />
            <span className={building.verificationChecks.geometryAgreement ? 'text-[#1B2B1F] font-medium' : 'text-[#A3A9A5] line-through'}>
              {t.geometryAgreement}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 ${building.verificationChecks.sourceAgreement ? 'text-[#4A7C44]' : 'text-[#A3A9A5]'}`} />
            <span className={building.verificationChecks.sourceAgreement ? 'text-[#1B2B1F] font-medium' : 'text-[#A3A9A5] line-through'}>
              {t.sourceAgreement}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 ${building.verificationChecks.spatialProximity ? 'text-[#4A7C44]' : 'text-[#A3A9A5]'}`} />
            <span className={building.verificationChecks.spatialProximity ? 'text-[#1B2B1F] font-medium' : 'text-[#A3A9A5] line-through'}>
              {t.spatialProximity}
            </span>
          </div>
        </div>

        {building.status === 'review' && (onApprove || onReject) && (
  <div className="flex gap-2.5 pt-1">
    <button
      onClick={() => onApprove && onApprove(building.id)}
      disabled={isResolving}
      className="flex-1 py-2.5 bg-[#4A7C44] hover:bg-[#3A5A40] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>{isResolving ? 'Saving…' : 'Approve'}</span>
    </button>
    <button
      onClick={() => onReject && onReject(building.id)}
      disabled={isResolving}
      className="flex-1 py-2.5 bg-white hover:bg-[#FDF2F0] border border-[#F8D7DA] disabled:opacity-50 text-[#D66D54] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
    >
      <AlertOctagon className="w-4 h-4" />
      <span>Reject</span>
    </button>
  </div>
)}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-2 mt-auto">
          <button
            onClick={onViewSources}
            className="w-full py-2.5 bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>Overlay & Compare Sources</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleHistory}
              className="w-full py-2 bg-white hover:bg-[#F8F9F8] border border-[#E8E6E1] text-[#2D312E] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[#5E6660]" />
              <span>Detailed History</span>
            </button>

            <button
              onClick={handleTechnical}
              className="w-full py-2 bg-white hover:bg-[#F8F9F8] border border-[#E8E6E1] text-[#2D312E] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-[#5E6660]" />
              <span>Technical Logs</span>
            </button>
          </div>
        </div>

        

      </div>

    </div>
  );
};
