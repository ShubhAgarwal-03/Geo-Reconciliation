import React from 'react';
import { BuildingEntity, Language, DatasetStats, ActivityEntry } from '../types';
import { translations } from '../data/i18n';
import { DISTRICT_LABEL } from '../config';
import { shortId, sourceLabel, sourceColor, fmtArea } from '../data/sources';
import { UploadCloud, CheckCircle2, AlertTriangle, Building2, TrendingUp, ArrowRight, Activity, Split, Maximize2 } from 'lucide-react';
import { InteractiveMap } from './InteractiveMap';

type MapProps = React.ComponentProps<typeof InteractiveMap>;

interface Props {
  stats: DatasetStats | null;
  statsError: string | null;
  activityLog: ActivityEntry[];
  mapProps: MapProps;
  selectedBuilding: BuildingEntity | null;
  language: Language;
  onOpenUpload: () => void;
  onGoToBeforeAfter: () => void;
  onGoToFullMap: () => void;
  onGoToReview: () => void;
}

const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

export const DashboardView: React.FC<Props> = ({
  stats, statsError, activityLog, mapProps, selectedBuilding, language,
  onOpenUpload, onGoToBeforeAfter, onGoToFullMap, onGoToReview,
}) => {
  const t = translations[language];
  const dash = (v: number | undefined) => (v == null ? '—' : v.toLocaleString());
  const pctMulti = stats && stats.totalEntities ? Math.round((stats.multiSourceEntities / stats.totalEntities) * 100) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">{t.ecosystemTag}</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight mt-2">Urban Land Data Console</h1>
          <p className="text-sm text-[#5E6660] font-medium mt-1 max-w-3xl">{t.tagline}</p>
          <p className="text-xs text-[#5E6660] mt-1">Dataset: <strong>{DISTRICT_LABEL}</strong> — reconciled from OpenStreetMap and Google Open Buildings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onOpenUpload} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[#3A5A40] text-[#3A5A40] font-bold text-sm bg-white hover:bg-[#F8F9F8] transition active:scale-95">
            <UploadCloud className="w-4 h-4" /><span>Use your own data</span>
          </button>
          <button onClick={onGoToBeforeAfter} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#F1F3F0] hover:bg-[#EAF2EA] text-[#2D312E] font-bold text-sm transition active:scale-95">
            <Split className="w-4 h-4 text-[#3A5A40]" /><span>Raw vs reconciled</span>
          </button>
        </div>
      </div>

      {statsError && <div className="p-3 rounded-2xl bg-[#FDF2F0] border border-[#F8D7DA] text-xs text-[#902A1A]">Couldn’t load dataset statistics: {statsError}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1]">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase text-[#A3A9A5] tracking-widest">{t.totalBuildings}</p><Building2 className="w-4 h-4 text-[#3A5A40]" /></div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">{dash(stats?.totalEntities)}</p>
          <span className="text-[11px] text-[#5E6660]">reconciled entities</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1]">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase text-[#A3A9A5] tracking-widest">Matched across sources</p><CheckCircle2 className="w-4 h-4 text-[#4A7C44]" /></div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">{dash(stats?.multiSourceEntities)}</p>
          <span className="text-[11px] text-[#5E6660]">{pctMulti == null ? '—' : `${pctMulti}% of entities`}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1]">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase text-[#A3A9A5] tracking-widest">{t.averageConfidence}</p><TrendingUp className="w-4 h-4 text-[#4A7C44]" /></div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">{stats ? `${stats.avgConfidence}%` : '—'}</p>
          <span className="text-[11px] text-[#5E6660]">{stats?.avgIouAgreement != null ? `IoU agreement ${stats.avgIouAgreement}%` : 'pipeline score'}</span>
        </div>
        <div onClick={onGoToReview} className="bg-[#FFF9F0] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#FDEACD] hover:border-[#D9A05B] transition cursor-pointer group">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase text-[#D9A05B] tracking-widest">{t.requiresReview}</p><AlertTriangle className="w-4 h-4 text-[#B07D3E]" /></div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#B07D3E]">{dash(stats?.needsReview)}</p>
          <div className="flex items-center justify-between"><span className="text-[11px] text-[#5E6660]">low confidence / single source</span><ArrowRight className="w-3.5 h-3.5 text-[#B07D3E] group-hover:translate-x-1 transition-transform" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-[#1B2B1F]">Spatial reconciliation console <span className="text-xs text-[#5E6660] font-medium hidden sm:inline">• click a footprint to inspect its sources</span></h2>
            <button onClick={onGoToFullMap} className="text-xs font-bold text-[#3A5A40] hover:text-[#1B2B1F] flex items-center gap-1 transition"><span>Full screen map</span><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="h-[460px] rounded-3xl overflow-hidden shadow-sm border border-[#E8E6E1] bg-[#E8E6E1]"><InteractiveMap {...mapProps} /></div>
        </div>

        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {selectedBuilding && (
            <div className="bg-[#1B2B1F] text-white rounded-3xl p-5 shadow-sm border border-[#2D4632]">
              <span className="text-[10px] font-bold text-[#BDC9BF] uppercase tracking-wider">Selected entity</span>
              <div className="text-lg font-serif font-bold font-mono mt-1">#{shortId(selectedBuilding.id)}</div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[#BDC9BF]">Area</span><span className="font-mono font-bold">{fmtArea(selectedBuilding.area)}</span></div>
                <div className="flex justify-between"><span className="text-[#BDC9BF]">Confidence</span><span className="font-mono font-bold">{selectedBuilding.confidence}%</span></div>
                <div className="pt-2 border-t border-white/10 space-y-1">
                  {selectedBuilding.sourceNames.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-[#BDC9BF]"><span className="w-2 h-2 rounded-full" style={{ background: sourceColor(s) }} />{sourceLabel(s)}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-5 border border-[#E8E6E1] shadow-sm flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F0]"><Activity className="w-4 h-4 text-[#3A5A40]" /><h3 className="text-sm font-serif font-bold text-[#1B2B1F]">{t.recentActivity} <span className="text-[10px] text-[#A3A9A5] font-sans font-semibold">(this session)</span></h3></div>
            {activityLog.length === 0 ? (
              <p className="text-xs text-[#5E6660] pt-4">Actions you take — uploads, approvals, pipeline runs — appear here.</p>
            ) : (
              <ul className="pt-3 space-y-3">
                {activityLog.slice(0, 6).map((a) => (
                  <li key={a.id} className="text-xs"><span className="font-semibold text-[#1B2B1F]">{a.title}</span><span className="block text-[10px] text-[#A3A9A5]">{ago(a.timestamp)}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
