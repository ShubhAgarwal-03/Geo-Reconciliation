import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Play } from 'lucide-react';
import { ActiveTab, BuildingEntity, DatasetStats, Language } from '../types';
import { DISTRICT_LABEL } from '../config';
import { sourceLabel, shortId } from '../data/sources';

interface Props {
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectBuilding: (b: BuildingEntity) => void;
  onOpenSourcesModal: () => void;
  example: BuildingEntity | null;
  stats: DatasetStats | null;
  language: Language;
}

export const DemoTourModal: React.FC<Props> = ({ onClose, onNavigateTab, onSelectBuilding, onOpenSourcesModal, example, stats }) => {
  const [i, setI] = useState(0);
  const n = (v?: number) => (v == null ? '…' : v.toLocaleString());
  const raw = stats ? Object.values(stats.rawFeaturesBySource).reduce((a, b) => a + b, 0) : undefined;

  const steps: { title: string; description: string; action: string; run: () => void }[] = [
    {
      title: 'The problem',
      description: 'The same building shows up in several datasets with slightly different shapes and areas. LandLens merges them into one entity and says how sure it is.',
      action: 'Open the dashboard', run: () => onNavigateTab('dashboard'),
    },
    {
      title: 'The dataset',
      description: `${DISTRICT_LABEL}: ${n(raw)} raw footprints from OpenStreetMap and Google Open Buildings became ${n(stats?.totalEntities)} reconciled entities; ${n(stats?.multiSourceEntities)} were matched across both sources.`,
      action: 'See the numbers', run: () => onNavigateTab('dashboard'),
    },
    {
      title: 'Explore the map',
      description: 'Footprints load for whatever area you are looking at. Green = verified, amber = needs review.',
      action: 'Open the map', run: () => onNavigateTab('map'),
    },
    {
      title: 'Inspect one building',
      description: example
        ? `Entity #${shortId(example.id)}: ${example.sourceNames.map(sourceLabel).join(' + ')}, confidence ${example.confidence}%. The panel lists each contributing source with its own area.`
        : 'Zoom into the map and click any footprint to see its contributing sources.',
      action: 'Select an example', run: () => { onNavigateTab('map'); if (example) onSelectBuilding(example); },
    },
    {
      title: 'Compare the raw sources',
      description: 'The overlay draws each source’s stored polygon next to the reconciled one, with no smoothing.',
      action: 'Open the comparison', run: () => { onNavigateTab('map'); if (example) { onSelectBuilding(example); onOpenSourcesModal(); } },
    },
    {
      title: 'Human review',
      description: `${n(stats?.needsReview)} entities scored below the confidence threshold and wait for a person to approve or reject them. Decisions are saved to the database.`,
      action: 'Open the review queue', run: () => onNavigateTab('review'),
    },
    {
      title: 'Reports',
      description: 'Confidence distribution, per-source counts and the latest pipeline run, all computed from the database.',
      action: 'Open reports', run: () => onNavigateTab('reports'),
    },
    {
      title: 'Bring your own data',
      description: 'Optional: upload a GeoJSON of your own footprints and run the matching pipeline with it. This can take several minutes.',
      action: 'Open the data tab', run: () => onNavigateTab('data'),
    },
  ];
  const cur = steps[i];
  const go = (k: number) => { setI(k); steps[k].run(); };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[460px] z-50 bg-[#1B2B1F] text-[#FAF9F6] rounded-3xl p-5 shadow-2xl border border-[#2D4632]">
      <div className="flex items-center justify-between pb-3 border-b border-[#2D4632]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#3A5A40] flex items-center justify-center"><Play className="w-3.5 h-3.5 fill-white text-white" /></div>
          <span className="text-xs font-bold tracking-wider text-[#BDC9BF]">Guided tour</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#A3B899] font-bold">{i + 1} / {steps.length}</span>
          <button onClick={onClose} className="p-1 rounded-lg text-[#BDC9BF] hover:text-white hover:bg-[#2D4632] transition"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="my-4 space-y-2">
        <h4 className="text-base font-serif font-bold text-white">{cur.title}</h4>
        <p className="text-xs text-[#BDC9BF] leading-relaxed">{cur.description}</p>
        <button onClick={cur.run} className="mt-2 w-full py-2.5 px-3 bg-[#2D4632] hover:bg-[#3A5A40] border border-[#3A5A40] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#D9A05B]" /><span>{cur.action}</span>
        </button>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#2D4632]">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="px-3 py-1.5 rounded-xl bg-[#2D4632] hover:bg-[#3A5A40] text-xs font-semibold disabled:opacity-30 flex items-center gap-1 transition"><ChevronLeft className="w-4 h-4" />Back</button>
        {i < steps.length - 1
          ? <button onClick={() => go(i + 1)} className="px-4 py-1.5 rounded-xl bg-[#3A5A40] hover:bg-[#4A7C44] text-white text-xs font-bold flex items-center gap-1 transition">Next<ChevronRight className="w-4 h-4" /></button>
          : <button onClick={onClose} className="px-4 py-1.5 rounded-xl bg-[#3A5A40] hover:bg-[#4A7C44] text-white text-xs font-bold transition">Finish</button>}
      </div>
    </div>
  );
};
