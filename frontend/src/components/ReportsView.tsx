import React, { useState } from 'react';
import { BuildingEntity, DatasetStats, Language } from '../types';
import { DISTRICT_LABEL } from '../config';
import { sourceLabel, sourceColor } from '../data/sources';
import { FileText, Download, CheckCircle2, BarChart3, PieChart, Loader2 } from 'lucide-react';

interface Props {
  stats: DatasetStats | null;
  statsError?: string | null;
  buildings: BuildingEntity[];
  language: Language;
}

const download = (name: string, type: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export const ReportsView: React.FC<Props> = ({ stats, statsError, buildings }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-sm text-[#5E6660]">
        {statsError ? `Couldn’t load statistics: ${statsError}` : <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading statistics…</span>}
      </div>
    );
  }

  const total = stats.totalEntities || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const rawTotal = Object.values(stats.rawFeaturesBySource).reduce((a, b) => a + b, 0);
  const run = stats.lastRun;

  const exportSummary = () => {
    const lines = [
      'LANDLENS — RECONCILIATION SUMMARY',
      `Generated: ${new Date().toLocaleString()}`,
      `Area: ${DISTRICT_LABEL}`,
      '--------------------------------------------------',
      `Reconciled entities: ${stats.totalEntities}`,
      `  matched across 2+ sources: ${stats.multiSourceEntities} (${pct(stats.multiSourceEntities)}%)`,
      `  single source: ${stats.singleSourceEntities} (${pct(stats.singleSourceEntities)}%)`,
      `Average confidence: ${stats.avgConfidence}%`,
      `Average IoU agreement (multi-source): ${stats.avgIouAgreement ?? 'n/a'}${stats.avgIouAgreement != null ? '%' : ''}`,
      `Needs review: ${stats.needsReview}   Decided by reviewers: ${stats.resolvedByReviewers}`,
      '',
      'Raw features by source:',
      ...Object.entries(stats.rawFeaturesBySource).map(([s, n]) => `  ${sourceLabel(s)}: ${n}`),
      '',
      run ? `Last pipeline run #${run.id}: ${run.rawFeatureCount ?? '?'} raw features -> ${run.canonicalEntityCount ?? '?'} entities (${run.reviewQueueCount ?? '?'} to review)` : 'No pipeline run recorded.',
    ];
    download('landlens_summary.txt', 'text/plain', lines.join('\n'));
    flash('Downloaded summary.');
  };

  const exportView = () => {
    const fc = {
      type: 'FeatureCollection',
      name: 'landlens_current_map_view',
      features: buildings.map((b) => ({
        type: 'Feature',
        properties: { id: b.id, areaM2: b.area, confidence: b.confidence, status: b.status, sources: b.sourceNames, agreementPct: b.agreementScore },
        geometry: { type: 'Polygon', coordinates: [b.coordinates.map(([lat, lng]) => [lng, lat])] },
      })),
    };
    download('landlens_map_view.geojson', 'application/geo+json', JSON.stringify(fc, null, 2));
    flash(`Exported ${buildings.length.toLocaleString()} entities from the current map view.`);
  };

  const buckets = [
    ['90–100%', stats.confidenceBuckets.high, '#3A5A40'],
    ['70–89%', stats.confidenceBuckets.medium, '#D9A05B'],
    ['below 70%', stats.confidenceBuckets.low, '#D66D54'],
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">Reports & analytics</h2>
          <p className="text-sm text-[#5E6660] mt-0.5">Figures are computed from the reconciled database — {DISTRICT_LABEL}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportSummary} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E8E6E1] hover:bg-[#F8F9F8] text-[#2D312E] text-xs font-bold transition"><FileText className="w-4 h-4 text-[#5E6660]" />Summary (.txt)</button>
          <button onClick={exportView} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold transition"><Download className="w-4 h-4" />Current map view (GeoJSON)</button>
        </div>
      </div>

      {msg && <div className="p-3 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-xs font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3A5A40]" />{msg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Reconciled entities', stats.totalEntities.toLocaleString(), `from ${rawTotal.toLocaleString()} raw features`],
          ['Matched across sources', `${stats.multiSourceEntities.toLocaleString()} (${pct(stats.multiSourceEntities)}%)`, `${stats.singleSourceEntities.toLocaleString()} seen by one source`],
          ['Average confidence', `${stats.avgConfidence}%`, stats.avgIouAgreement == null ? 'no cross-source pairs' : `avg IoU agreement ${stats.avgIouAgreement}%`],
          ['Needs review', stats.needsReview.toLocaleString(), `${stats.resolvedByReviewers.toLocaleString()} decided by reviewers`],
        ].map(([k, v, sub]) => (
          <div key={k} className="bg-white p-4 rounded-2xl border border-[#E8E6E1] shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">{k}</span>
            <span className="text-2xl font-serif font-bold text-[#1B2B1F] mt-1 block">{v}</span>
            <span className="text-[11px] text-[#5E6660]">{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-base font-serif font-bold text-[#1B2B1F]">Confidence distribution</h3><span className="text-xs text-[#5E6660]">Entities grouped by pipeline confidence</span></div>
            <BarChart3 className="w-5 h-5 text-[#3A5A40]" />
          </div>
          <div className="space-y-4">
            {buckets.map(([label, n, color]) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-semibold mb-1"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />{label}</span><span className="font-mono font-bold">{n.toLocaleString()} ({pct(n)}%)</span></div>
                <div className="h-2 bg-[#F1F3F0] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct(n)}%`, background: color }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-base font-serif font-bold text-[#1B2B1F]">Input sources</h3><span className="text-xs text-[#5E6660]">Raw footprints ingested per source</span></div>
            <PieChart className="w-5 h-5 text-[#3A5A40]" />
          </div>
          <div className="space-y-4">
            {Object.entries(stats.rawFeaturesBySource).map(([s, n]) => (
              <div key={s}>
                <div className="flex justify-between text-xs font-semibold mb-1"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColor(s) }} />{sourceLabel(s)}</span><span className="font-mono font-bold">{n.toLocaleString()}</span></div>
                <div className="h-2 bg-[#F1F3F0] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${rawTotal ? (n / rawTotal) * 100 : 0}%`, background: sourceColor(s) }} /></div>
              </div>
            ))}
          </div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#A3A9A5] mt-6 mb-2">Entities by source combination</h4>
          <div className="divide-y divide-[#F1F3F0] text-xs">
            {stats.entitiesBySourceCombo.map((c) => (
              <div key={c.sources.join('+')} className="flex justify-between py-2"><span>{c.sources.map(sourceLabel).join(' + ')}</span><span className="font-mono font-bold">{c.count.toLocaleString()}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm text-xs">
        <h3 className="text-base font-serif font-bold text-[#1B2B1F] mb-3">Latest pipeline run</h3>
        {run ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Run</span>#{run.id}</div>
            <div><span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Started</span>{new Date(run.startedAt).toLocaleString()}</div>
            <div><span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Status</span>{run.error ? `Failed — ${run.error}` : run.completedAt ? `Completed ${new Date(run.completedAt).toLocaleString()}` : 'Running / unfinished'}</div>
            <div><span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Result</span>{run.rawFeatureCount ?? '—'} raw → {run.canonicalEntityCount ?? '—'} entities</div>
          </div>
        ) : <p className="text-[#5E6660]">No pipeline run has been recorded.</p>}
        <p className="text-[11px] text-[#A3A9A5] mt-4">Matching precision/recall against the reference set is produced offline by <code>python -m verification.evaluate_matching</code>; it is not recomputed in the browser.</p>
      </div>
    </div>
  );
};
