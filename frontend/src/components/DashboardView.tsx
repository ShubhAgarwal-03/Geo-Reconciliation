import React from 'react';
import { 
  BuildingEntity, 
  Language, 
  ReconciliationStats,
  ActivityEntry,
} from '../types';
import { translations } from '../data/i18n';
import { 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  TrendingUp, 
  Compass, 
  ArrowRight,
  Activity,
  Split,
  Maximize2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { InteractiveMap } from './InteractiveMap';

interface DashboardViewProps {
  buildings: BuildingEntity[];
  stats: ReconciliationStats;
  dataSource: 'live' | 'osm' | 'mock';
  activityLog: ActivityEntry[];
  showcaseBuilding: BuildingEntity | null;
  selectedBuilding: BuildingEntity | null;
  onSelectBuilding: (building: BuildingEntity) => void;
  language: Language;
  onOpenUpload: () => void;
  onOpenReconciliation: () => void;
  onGoToBeforeAfter: () => void;
  onGoToFullMap: () => void;
  onGoToReview: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

const SOURCE_LABELS: Record<string, string> = {
  ori: 'Drone (ORI)',
  municipal: 'Municipal GIS',
  cadastral: 'Cadastral',
  ai: 'AI Extraction',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  buildings,
  stats,
  dataSource,
  activityLog,
  showcaseBuilding,
  selectedBuilding,
  onSelectBuilding,
  language,
  onOpenUpload,
  onOpenReconciliation,
  onGoToBeforeAfter,
  onGoToFullMap,
  onGoToReview,
}) => {
  const t = translations[language];

  const matchedPct = stats.totalBuildings > 0
    ? Math.round((stats.matched / stats.totalBuildings) * 100)
    : 0;
  const confidenceDelta = stats.afterAvgConfidence - stats.beforeAvgConfidence;
  const sourceTypesPresent = new Set(
    buildings.flatMap(b =>
      Object.entries(b.sources)
        .filter(([, s]) => s.sourceName !== 'not captured')
        .map(([type]) => type)
    )
  ).size;

  const showcaseSourceEntries = showcaseBuilding
    ? (['ori', 'municipal'] as const).map((key) => ({
        key,
        label: SOURCE_LABELS[key],
        source: showcaseBuilding.sources[key],
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">
              {t.ecosystemTag}
            </span>
            <span className="text-xs text-[#A3A9A5] font-bold">•</span>
            <span className="text-xs font-semibold text-[#5E6660] flex items-center gap-1">
              {dataSource === 'live' ? (
                <>
                  <Wifi className="w-3 h-3 text-[#4A7C44]" />
                  Connected to live Geo-Reconciliation API
                </>
              ) : dataSource === 'osm' ? (
                <>
                  <Wifi className="w-3 h-3 text-[#B07D3E]" />
                  Backend unreachable — showing real OpenStreetMap footprints, unreconciled
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-[#B07D3E]" />
                  API and OpenStreetMap both unreachable — showing local demo data
                </>
              )}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">
            Urban Land Data Console
          </h1>
          <p className="text-sm text-[#5E6660] font-medium mt-1 max-w-3xl">
            {t.tagline}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[#3A5A40] text-[#3A5A40] font-bold text-sm bg-white hover:bg-[#F8F9F8] shadow-2xs transition active:scale-95"
          >
            <UploadCloud className="w-4 h-4 text-[#3A5A40]" />
            <span>{t.uploadData}</span>
          </button>

          <button
            onClick={onGoToBeforeAfter}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#F1F3F0] hover:bg-[#EAF2EA] text-[#2D312E] font-bold text-sm transition active:scale-95"
          >
            <Split className="w-4 h-4 text-[#3A5A40]" />
            <span>{t.compareData}</span>
          </button>

          <button
            onClick={onOpenReconciliation}
            className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white font-bold text-sm shadow-md shadow-[#3A5A40]/20 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.startReconciliation}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1] hover:border-[#D1CFCA] transition">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-[#A3A9A5] tracking-widest">
              {t.totalBuildings}
            </p>
            <div className="w-8 h-8 rounded-xl bg-[#F1F3F0] text-[#3A5A40] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">
              {stats.totalBuildings.toLocaleString()}
            </p>
          </div>
          <span className="text-[11px] text-[#5E6660] font-medium block mt-1">
            {sourceTypesPresent > 0
              ? `Across ${sourceTypesPresent} input survey source${sourceTypesPresent === 1 ? '' : 's'} seen in loaded data`
              : 'No source data loaded yet'}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1] hover:border-[#BDC9BF] transition">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-[#4A7C44] tracking-widest">
              {t.matched}
            </p>
            <div className="w-8 h-8 rounded-xl bg-[#EAF2EA] text-[#4A7C44] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">
              {stats.matched.toLocaleString()}
            </p>
            <span className="text-xs font-sans text-[#4A7C44] font-bold">
              ({matchedPct}%)
            </span>
          </div>
          <span className="text-[11px] text-[#5E6660] font-medium block mt-1">
            Reconciled unified entities
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E8E6E1] hover:border-[#D1CFCA] transition">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-[#A3A9A5] tracking-widest">
              {t.averageConfidence}
            </p>
            <div className="w-8 h-8 rounded-xl bg-[#F1F3F0] text-[#3A5A40] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#3A5A40]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F]">
              {stats.averageConfidence}%
            </p>
            <span className="text-xs font-bold text-[#4A7C44]" title="Demo baseline — backend doesn't track a raw/pre-reconciliation confidence figure yet">
              {confidenceDelta >= 0 ? '+' : ''}{confidenceDelta}% vs raw (demo baseline)
            </span>
          </div>
          <span className="text-[11px] text-[#5E6660] font-medium block mt-1">
            Consensus agreement score
          </span>
        </div>

        <div 
          onClick={onGoToReview}
          className="bg-[#FFF9F0] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#FDEACD] hover:border-[#D9A05B] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-[#D9A05B] tracking-widest">
              {t.requiresReview}
            </p>
            <div className="w-8 h-8 rounded-xl bg-[#FFF2E0] text-[#B07D3E] flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4 text-[#B07D3E]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#B07D3E]">
              {stats.requiresReview}
            </p>
            <span className="text-xs font-bold text-[#B07D3E] bg-[#FFF2E0] px-1.5 py-0.5 rounded border border-[#FDEACD]">
              Action Required
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-[#5E6660] font-medium">Low confidence/variance</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#B07D3E] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-bold text-[#1B2B1F]">
                Spatial Reconciliation Console
              </h2>
              <span className="text-xs text-[#5E6660] font-medium hidden sm:inline">
                • Click any parcel to inspect source agreements
              </span>
            </div>

            <button
              onClick={onGoToFullMap}
              className="text-xs font-bold text-[#3A5A40] hover:text-[#1B2B1F] flex items-center gap-1 transition"
            >
              <span>Full Screen Map</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[460px] rounded-3xl overflow-hidden shadow-sm border border-[#E8E6E1] bg-[#E8E6E1]">
            <InteractiveMap
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={onSelectBuilding}
              language={language}
              onOpenReconcileModal={onOpenReconciliation}
              onOpenUploadModal={onOpenUpload}
              dataSource={dataSource}
            />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {showcaseBuilding && (
            <div className="bg-[#1B2B1F] text-white rounded-3xl p-5 shadow-sm border border-[#2D4632]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[10px] font-bold text-[#BDC9BF] uppercase tracking-wider">
                  Showcase Reconciliation
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  showcaseBuilding.status === 'reconciled'
                    ? 'bg-[#EAF2EA] text-[#4A7C44]'
                    : showcaseBuilding.status === 'review'
                    ? 'bg-[#FFF2E0] text-[#B07D3E]'
                    : 'bg-[#FDF2F0] text-[#D66D54]'
                }`}>
                  {showcaseBuilding.status === 'reconciled' && '✓ RECONCILED'}
                  {showcaseBuilding.status === 'review' && '⚠ NEEDS REVIEW'}
                  {showcaseBuilding.status === 'conflict' && '✕ CONFLICT'}
                </span>
              </div>

              <div className="my-3">
                <div className="text-xl font-serif font-bold flex items-center gap-2">
                  <span>Building #{showcaseBuilding.id}</span>
                </div>
                <span className="text-xs text-[#BDC9BF] block mt-0.5">
                  {showcaseBuilding.surveyNumber !== 'N/A' ? `Survey ${showcaseBuilding.surveyNumber} • ` : ''}
                  Harmonized Area: {showcaseBuilding.area ?? '—'} m²
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                {showcaseSourceEntries.map(({ key, label, source }) => (
                  <div key={key} className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <span className="text-[10px] text-[#A3A9A5] block font-semibold">{label}</span>
                    <span className="font-mono font-bold text-[#D9A05B]">
                      {source.sourceName !== 'not captured' ? `${source.area} m²` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onSelectBuilding(showcaseBuilding);
                  onGoToFullMap();
                }}
                className="w-full py-2.5 bg-[#3A5A40] hover:bg-[#4A7C44] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Inspect Building #{showcaseBuilding.id} on Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl p-5 border border-[#E8E6E1] shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F3F0]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3A5A40]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B2B1F]">
                    {t.recentActivity}
                  </h3>
                </div>
                <span className="text-[10px] text-[#A3A9A5] font-bold">This session</span>
              </div>

              {activityLog.length === 0 ? (
                <p className="text-xs text-[#A3A9A5] italic py-4 text-center">
                  No activity yet — actions like approving entities, uploading files, or running reconciliation will show up here.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {activityLog.map((act) => (
                    <div key={act.id} className="text-xs flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {act.type === 'success' || act.type === 'verified' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C44]" />
                        ) : act.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D9A05B]" />
                        ) : (
                          <Compass className="w-3.5 h-3.5 text-[#3A5A40]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#2D312E] leading-snug">{act.title}</p>
                        <span className="text-[10px] text-[#A3A9A5] font-medium block mt-0.5">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#F1F3F0] mt-3 text-center">
              <span className="text-[11px] font-semibold text-[#5E6660]">
                {dataSource === 'live'
                  ? 'Connected to Geo-Reconciliation API'
                  : dataSource === 'osm'
                  ? 'Showing real OpenStreetMap footprints (unreconciled)'
                  : 'Running on local demo data'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};