import React from 'react';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { sourceLabel, sourceColor, shortId, fmtArea, fmtPct } from '../data/sources';
import {
  X, CheckCircle2, AlertOctagon, Layers, History, FileCode, BadgeCheck, Loader2, Info,
} from 'lucide-react';

interface BuildingDetailPanelProps {
  building: BuildingEntity | null;
  onClose: () => void;
  language: Language;
  detailError?: string | null;
  onViewSources: () => void;
  onOpenHistory?: () => void;
  onOpenTechnicalDetails?: () => void;
  onOpenDigitalCard?: () => void;
  onApprove?: (buildingId: string) => void;
  onReject?: (buildingId: string) => void;
  isResolving?: boolean;
}

export const BuildingDetailPanel: React.FC<BuildingDetailPanelProps> = ({
  building, onClose, language, detailError, onViewSources,
  onOpenHistory, onOpenTechnicalDetails, onOpenDigitalCard, onApprove, onReject, isResolving,
}) => {
  const t = translations[language];

  if (!building) {
    return (
      <div className="w-full lg:w-96 bg-white border-l border-[#E8E6E1] flex flex-col h-full items-center justify-center p-6 text-center text-[#5E6660]">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F3F0] flex items-center justify-center mb-3">
          <Layers className="w-6 h-6 text-[#3A5A40]" />
        </div>
        <h3 className="font-serif font-bold text-lg text-[#1B2B1F] mb-1">No Entity Selected</h3>
        <p className="text-xs max-w-xs">Click any building footprint on the map to see which sources contributed and how well they agree.</p>
      </div>
    );
  }

  const badge = {
    reconciled: <span className="px-2.5 py-1 bg-[#EAF2EA] text-[#4A7C44] text-[10px] font-bold rounded-md border border-[#BDC9BF]/50">✓ VERIFIED</span>,
    review: <span className="px-2.5 py-1 bg-[#FFF9F0] text-[#B07D3E] text-[10px] font-bold rounded-md border border-[#FDEACD]">⚠ NEEDS REVIEW</span>,
    conflict: <span className="px-2.5 py-1 bg-[#FDF2F0] text-[#D66D54] text-[10px] font-bold rounded-md border border-[#F8D7DA]">✕ REJECTED</span>,
  }[building.status];

  const buildingTypes = Array.from(new Set((building.members ?? []).map((m) => m.buildingType).filter(Boolean)));

  return (
    <div className="w-full lg:w-96 bg-white border-l border-[#E8E6E1] flex flex-col h-full overflow-y-auto">
      <div className="p-5 border-b border-[#F1F3F0] sticky top-0 bg-white/95 backdrop-blur-xs z-10">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider">Selected Entity</p>
            <h3 className="text-xl font-serif font-bold text-[#1B2B1F] font-mono" title={building.id}>#{shortId(building.id)}</h3>
            <div className="text-[11px] text-[#5E6660] font-medium mt-0.5">
              {building.tileId ? `Tile ${building.tileId} • ` : ''}{building.sourcesCount} source{building.sourcesCount === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onOpenDigitalCard} className="text-[11px] font-bold text-[#3A5A40] flex items-center gap-1 bg-[#EAF2EA] hover:bg-[#D6E0D8] px-2.5 py-1 rounded-lg border border-[#BDC9BF] transition" title="Entity record card">
              <BadgeCheck className="w-3.5 h-3.5 text-[#4A7C44]" /><span>Card</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F1F3F0] text-[#A3A9A5] hover:text-[#1B2B1F] transition" title="Close panel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>{badge}</div>
          <span className="text-xs text-[#5E6660] font-medium">
            Source agreement: <strong className="text-[#1B2B1F]">{building.agreementScore == null ? 'n/a' : `${building.agreementScore}%`}</strong>
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F8F9F8] p-3 rounded-xl border border-[#E8E6E1]/80">
            <p className="text-[10px] text-[#5E6660] font-semibold uppercase">{t.area}</p>
            <p className="text-lg font-bold text-[#1B2B1F] mt-0.5">{fmtArea(building.area)}</p>
            <span className="text-[10px] text-[#A3A9A5] block">Reconciled footprint</span>
          </div>
          <div className="bg-[#F8F9F8] p-3 rounded-xl border border-[#E8E6E1]/80">
            <p className="text-[10px] text-[#5E6660] font-semibold uppercase">{t.confidence}</p>
            <p className="text-lg font-bold text-[#4A7C44] mt-0.5">{building.confidence}%</p>
            <span className="text-[10px] text-[#A3A9A5] block">Pipeline score</span>
          </div>
        </div>

        {/* Real per-source contributions */}
        <div className="space-y-2 bg-white rounded-2xl p-3.5 border border-[#E8E6E1]">
          <div className="flex items-center justify-between pb-1 border-b border-[#F1F3F0]">
            <p className="text-[10px] font-bold text-[#A3A9A5] uppercase tracking-wider">Contributing sources</p>
            <span className="text-[10px] font-bold text-[#3A5A40] bg-[#EAF2EA] px-2 py-0.5 rounded-full">{building.sourcesCount}</span>
          </div>

          {!building.detailLoaded && !detailError && (
            <div className="flex items-center gap-2 text-xs text-[#5E6660] py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading source geometry…</div>
          )}

          {building.members ? (
            <div className="divide-y divide-[#F1F3F0] text-xs">
              {building.members.map((m) => (
                <div key={m.id} className="flex justify-between items-center py-2">
                  <span className="text-[#5E6660] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: sourceColor(m.source) }} />
                    {sourceLabel(m.source)}
                  </span>
                  <span className="text-right">
                    <span className="font-mono font-bold text-[#1B2B1F]">{fmtArea(m.areaM2)}</span>
                    {m.confidence != null && <span className="block text-[10px] text-[#A3A9A5]">source confidence {m.confidence}%</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[#F1F3F0] text-xs">
              {building.sourceNames.map((s) => (
                <div key={s} className="flex items-center gap-1.5 py-2 text-[#5E6660]">
                  <span className="w-2 h-2 rounded-full" style={{ background: sourceColor(s) }} />{sourceLabel(s)}
                </div>
              ))}
            </div>
          )}
          {detailError && <p className="text-[10px] text-[#B07D3E] flex items-center gap-1"><Info className="w-3 h-3" /> Per-source geometry unavailable: {detailError}</p>}
          {buildingTypes.length > 0 && (
            <p className="text-[11px] text-[#5E6660] pt-1">Building type (from sources): <strong className="text-[#1B2B1F]">{buildingTypes.join(', ')}</strong></p>
          )}
        </div>

        {/* Match quality */}
        <div className="bg-[#F8F9F8] p-3.5 rounded-2xl border border-[#E8E6E1]">
          <div className="flex justify-between text-[10px] font-bold text-[#1B2B1F] mb-1.5">
            <span className="uppercase tracking-wider">Overall confidence</span>
            <span className="font-mono text-[#4A7C44]">{building.confidence}%</span>
          </div>
          <div className="h-2 w-full bg-[#F1F3F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#3A5A40] transition-all duration-500 rounded-full" style={{ width: `${building.confidence}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-[#5E6660]">
            <div>Match score<strong className="block text-[#1B2B1F] text-sm">{building.matchScore == null ? 'n/a' : `${building.matchScore}%`}</strong></div>
            <div>Geometric agreement (IoU)<strong className="block text-[#1B2B1F] text-sm">{building.agreementScore == null ? 'n/a' : `${building.agreementScore}%`}</strong></div>
          </div>
          {building.sourcesCount === 1 && (
            <p className="text-[10px] text-[#B07D3E] font-semibold mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> Seen by one source only — never cross-validated.
            </p>
          )}
          {building.sourcesCount > 1 && building.status === 'reconciled' && (
            <p className="text-[10px] text-[#4A7C44] font-semibold mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Matched across {building.sourcesCount} datasets.
            </p>
          )}
        </div>

        {building.status === 'review' && (onApprove || onReject) && (
          <div className="flex gap-2.5 pt-1">
            <button onClick={() => onApprove?.(building.id)} disabled={isResolving}
              className="flex-1 py-2.5 bg-[#4A7C44] hover:bg-[#3A5A40] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /><span>{isResolving ? 'Saving…' : 'Approve'}</span>
            </button>
            <button onClick={() => onReject?.(building.id)} disabled={isResolving}
              className="flex-1 py-2.5 bg-white hover:bg-[#FDF2F0] border border-[#F8D7DA] disabled:opacity-50 text-[#D66D54] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2">
              <AlertOctagon className="w-4 h-4" /><span>Reject</span>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2 mt-auto">
          <button onClick={onViewSources} disabled={!building.members || building.members.length === 0}
            className="w-full py-2.5 bg-[#3A5A40] hover:bg-[#2D4632] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2">
            <Layers className="w-4 h-4" /><span>Overlay & compare sources</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onOpenHistory} className="w-full py-2 bg-white hover:bg-[#F8F9F8] border border-[#E8E6E1] text-[#2D312E] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#5E6660]" /><span>Audit trail</span>
            </button>
            <button onClick={onOpenTechnicalDetails} className="w-full py-2 bg-white hover:bg-[#F8F9F8] border border-[#E8E6E1] text-[#2D312E] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#5E6660]" /><span>Match metrics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
