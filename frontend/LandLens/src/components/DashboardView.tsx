import React, { useState, useEffect } from 'react';
import { 
  CanonicalEntity, 
  Language, 
  BackendStats 
} from '../types';
import { translations } from '../data/i18n';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  ArrowRight,
  Database,
  MapPin,
  Split,
  Layers,
  TrendingUp,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface DashboardViewProps {
  language: Language;
  onGoToFullMap: () => void;
  onGoToReview: () => void;
  onOpenReconciliation: () => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  onGoToFullMap,
  onGoToReview,
  onOpenReconciliation,
  onOpenUpload,
}) => {
  const t = translations[language] || {
    tagline: "High-precision geospatial reconciliation of discordant land and building footprint registries.",
  };

  const [stats, setStats] = useState<BackendStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    api.getStats()
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.warn('Could not load backend stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const total = stats?.total_entities || 0;
  const matched = stats?.matched_entities || 0;
  const review = stats?.needs_review_count || 0;
  const avgConf = stats ? Math.round(stats.avg_confidence * 100) : 0;
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">
              NAKSHA Geospatial Reconciliation Console
            </span>
            <span className="text-xs text-[#A3A9A5] font-bold">•</span>
            <span className="text-xs font-semibold text-[#5E6660]">
              Bengaluru Urban District (UTM 43N)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">
            Urban Land & Footprint Reconciliation Console
          </h1>
          <p className="text-sm text-[#5E6660] font-medium mt-1 max-w-3xl">
            {t.tagline}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl border border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-[#2D312E] transition active:scale-95"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onGoToFullMap}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white font-bold text-xs shadow-md shadow-[#3A5A40]/20 transition active:scale-95"
          >
            <MapPin className="w-4 h-4" />
            <span>Open Spatial Map</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5E6660]">
            <span className="text-xs font-bold uppercase tracking-wider">Canonical Entities</span>
            <Building2 className="w-4 h-4 text-[#3A5A40]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#1B2B1F]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : total.toLocaleString()}
          </div>
          <div className="text-xs text-[#5E6660] flex items-center gap-1">
            <span>Reconciled master footprints</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5E6660]">
            <span className="text-xs font-bold uppercase tracking-wider">Cross-Source Matches</span>
            <Split className="w-4 h-4 text-[#3A5A40]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#1B2B1F]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : matched.toLocaleString()}
          </div>
          <div className="text-xs text-[#4A7C44] font-semibold flex items-center gap-1">
            <span>{matchRate}% multi-source agreement rate</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5E6660]">
            <span className="text-xs font-bold uppercase tracking-wider">Average Confidence</span>
            <TrendingUp className="w-4 h-4 text-[#3A5A40]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#1B2B1F]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${avgConf}%`}
          </div>
          <div className="text-xs text-[#5E6660]">
            <span>Weighted IoU + spatial proximity</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={onGoToReview}
          className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs space-y-2 cursor-pointer hover:border-[#B07D3E] transition"
        >
          <div className="flex items-center justify-between text-[#B07D3E]">
            <span className="text-xs font-bold uppercase tracking-wider">Flagged for Review</span>
            <AlertTriangle className="w-4 h-4 text-[#B07D3E]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-[#1B2B1F]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : review.toLocaleString()}
          </div>
          <div className="text-xs text-[#B07D3E] font-semibold flex items-center gap-1">
            <span>Requires operator sign-off &rarr;</span>
          </div>
        </div>

      </div>

      {/* Secondary Cards: Ingestion Sources & Pipeline Run Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Data Sources Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8E6E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#1B2B1F]">
              Ingested Geospatial Layers
            </h3>
            <span className="text-xs font-bold text-[#5E6660]">PostGIS Unified</span>
          </div>

          <div className="space-y-3">
            {stats && stats.sources_distribution && Object.keys(stats.sources_distribution).length > 0 ? (
              Object.entries(stats.sources_distribution).map(([source, count]) => {
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#1B2B1F]">
                      <span className="uppercase">{source.replace(/_/g, ' ')}</span>
                      <span>{count.toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F3F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3A5A40] rounded-full"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-[#5E6660] py-4 text-center">
                {loading ? 'Loading source distribution...' : 'Run offline batch pipeline to populate sources.'}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Latest Pipeline Execution Run */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8E6E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#1B2B1F]">
              Batch Engine Execution Log
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF2EA] text-[#4A7C44]">
              {stats?.latest_run ? 'Completed' : 'Ready'}
            </span>
          </div>

          {stats?.latest_run ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#F1F3F0]">
                <span className="text-[#5E6660]">Batch Run ID:</span>
                <span className="font-mono font-bold text-[#1B2B1F]">#{stats.latest_run.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F3F0]">
                <span className="text-[#5E6660]">Raw Features Ingested:</span>
                <span className="font-bold text-[#1B2B1F]">{stats.latest_run.raw_feature_count?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F3F0]">
                <span className="text-[#5E6660]">Canonical Entities Generated:</span>
                <span className="font-bold text-[#1B2B1F]">{stats.latest_run.canonical_entity_count?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#5E6660]">Completed At:</span>
                <span className="font-semibold text-[#1B2B1F]">{stats.latest_run.run_completed_at || 'Just now'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#5E6660] py-6 text-center space-y-2">
              <Database className="w-6 h-6 mx-auto text-[#A3A9A5]" />
              <p>No offline batch runs logged in pipeline_runs table yet.</p>
              <p className="text-[11px] text-[#A3A9A5]">Execute <code>python -m pipeline.run_offline_batch</code> in the backend.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
