import React, { useEffect, useState } from 'react';
import { BuildingEntity, DatasetStats, Language } from '../types';
import { fetchEntityMembers } from '../api/geoReconciliationClient';
import { adaptMember } from '../api/adapter';
import { sourceLabel, sourceColor, shortId, fmtArea } from '../data/sources';
import { FootprintOverlay } from './FootprintOverlay';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  buildings: BuildingEntity[];
  stats: DatasetStats | null;
  language: Language;
  onGoToMap: () => void;
}

export const BeforeAfterView: React.FC<Props> = ({ buildings, stats, onGoToMap }) => {
  const example = buildings.find((b) => b.sourcesCount > 1) ?? null;
  const [withMembers, setWithMembers] = useState<BuildingEntity | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);

  useEffect(() => {
    setWithMembers(null); setErr(null);
    if (!example) return;
    let cancelled = false;
    fetchEntityMembers(example.id)
      .then((m) => { if (!cancelled) setWithMembers({ ...example, members: m.map(adaptMember) }); })
      .catch((e) => { if (!cancelled) setErr(e instanceof Error ? e.message : 'failed'); });
    return () => { cancelled = true; };
  }, [example?.id]);

  const raw = stats ? Object.values(stats.rawFeaturesBySource).reduce((a, b) => a + b, 0) : null;
  const merged = stats && raw != null ? raw - stats.totalEntities : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">Raw sources → reconciled entities</h2>
          <p className="text-sm text-[#5E6660] mt-0.5">What the pipeline did to the ingested data, using numbers from the database.</p>
        </div>
        <button onClick={onGoToMap} className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold transition">Explore on map</button>
      </div>

      {stats && raw != null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E8E6E1] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A9A5]">Before: raw footprints</span>
            <div className="text-3xl font-serif font-bold text-[#1B2B1F] my-2">{raw.toLocaleString()}</div>
            <div className="text-xs text-[#5E6660] space-y-0.5">
              {Object.entries(stats.rawFeaturesBySource).map(([s, n]) => (
                <div key={s} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: sourceColor(s) }} />{sourceLabel(s)}: {n.toLocaleString()}</div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E8E6E1] shadow-sm flex flex-col justify-center items-center text-center">
            <ArrowRight className="w-6 h-6 text-[#A3A9A5]" />
            <div className="text-2xl font-serif font-bold text-[#4A7C44] mt-2">{merged?.toLocaleString()}</div>
            <div className="text-xs text-[#5E6660]">duplicate footprints merged</div>
          </div>
          <div className="bg-[#EAF2EA] rounded-2xl p-5 border border-[#BDC9BF] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44]">After: reconciled entities</span>
            <div className="text-3xl font-serif font-bold text-[#1B2B1F] my-2">{stats.totalEntities.toLocaleString()}</div>
            <div className="text-xs text-[#5E6660]">{stats.multiSourceEntities.toLocaleString()} matched across sources • {stats.needsReview.toLocaleString()} need review</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
        <h3 className="text-base font-serif font-bold text-[#1B2B1F]">A real example from the map</h3>
        {!example && <p className="text-xs text-[#5E6660] mt-2">Open the map and zoom into an area with buildings — a multi-source entity from your current view will appear here.</p>}
        {example && !withMembers && !err && <div className="flex items-center gap-2 text-xs text-[#5E6660] mt-3"><Loader2 className="w-4 h-4 animate-spin" />Loading source geometry…</div>}
        {err && <p className="text-xs text-[#B07D3E] mt-2">Couldn’t load source geometry: {err}</p>}
        {withMembers && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="relative aspect-square bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl overflow-hidden select-none">
                <div className="absolute inset-0 p-2"><FootprintOverlay building={withMembers} mode="reconciled" /></div>
                <div className="absolute inset-0 p-2 bg-[#FAF9F6] border-r-2 border-[#D9A05B]" style={{ width: `${slider}%`, overflow: 'hidden' }}>
                  <div style={{ width: `${10000 / Math.max(slider, 1)}%`, height: '100%' }}><FootprintOverlay building={withMembers} mode="sources" /></div>
                </div>
                <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10" aria-label="Before/after slider" />
                <div className="absolute top-0 bottom-0 w-0.5 bg-[#D9A05B] pointer-events-none" style={{ left: `${slider}%` }} />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-[#5E6660] mt-2"><span>← Raw source footprints</span><span>Reconciled footprint →</span></div>
            </div>
            <div className="text-xs space-y-2">
              <div className="font-mono text-[#5E6660]">Entity #{shortId(withMembers.id)}</div>
              {withMembers.members?.map((m) => (
                <div key={m.id} className="flex justify-between p-2 rounded-xl border border-[#E8E6E1]"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColor(m.source) }} />{sourceLabel(m.source)}</span><span className="font-mono font-bold">{fmtArea(m.areaM2)}</span></div>
              ))}
              <div className="flex justify-between p-2 rounded-xl border border-[#BDC9BF] bg-[#EAF2EA]"><span className="font-bold">Reconciled</span><span className="font-mono font-bold">{fmtArea(withMembers.area)}</span></div>
              <div className="text-[#5E6660]">Confidence {withMembers.confidence}% • agreement {withMembers.agreementScore == null ? 'n/a' : `${withMembers.agreementScore}%`}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
