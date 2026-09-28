import React, { useState } from 'react';
import { X, Layers, RotateCcw, Sparkles } from 'lucide-react';
import { BuildingEntity, Language } from '../types';
import { sourceLabel, sourceColor, shortId, fmtArea } from '../data/sources';
import { FootprintOverlay } from './FootprintOverlay';

interface Props { building: BuildingEntity; onClose: () => void; language: Language }

export const SourceComparisonModal: React.FC<Props> = ({ building, onClose }) => {
  const [mode, setMode] = useState<'sources' | 'both' | 'reconciled'>('sources');
  const [hidden, setHidden] = useState<string[]>([]);
  const members = building.members ?? [];
  const sources = Array.from(new Set(members.map((m) => m.source)));
  const visible = sources.filter((s) => !hidden.includes(s));
  const base = building.area ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <span className="text-xs text-[#5E6660] font-mono">Entity #{shortId(building.id)}</span>
            <h3 className="text-xl font-serif font-bold text-[#1B2B1F]">Source footprints vs reconciled footprint</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl aspect-square p-2">
              <FootprintOverlay building={building} mode={mode} visibleSources={visible} />
            </div>
            <div className="flex items-center gap-1 mt-3 bg-[#F1F3F0] p-1 rounded-xl text-xs font-bold border border-[#E8E6E1] w-fit">
              {([['sources', 'Raw sources'], ['both', 'Overlay'], ['reconciled', 'Reconciled']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setMode(k)}
                  className={`px-3 py-1.5 rounded-lg transition ${mode === k ? 'bg-white text-[#1B2B1F] shadow-2xs' : 'text-[#5E6660] hover:text-[#1B2B1F]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#A3A9A5] mt-2">Polygons are drawn from the stored source geometries — no offsets or smoothing applied.</p>
          </div>

          <div className="space-y-3 text-xs">
            {members.map((m) => {
              const diff = m.areaM2 != null && base ? m.areaM2 - base : null;
              const off = hidden.includes(m.source);
              return (
                <button key={m.id} onClick={() => setHidden((h) => off ? h.filter((x) => x !== m.source) : [...h, m.source])}
                  className={`w-full text-left p-3 rounded-2xl border transition ${off ? 'opacity-40' : ''} border-[#E8E6E1] bg-white hover:bg-[#FAF9F6]`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-[#1B2B1F]">
                      <span className="w-3 h-3 rounded-full" style={{ background: sourceColor(m.source) }} />{sourceLabel(m.source)}
                    </span>
                    <span className="font-mono font-bold text-[#1B2B1F]">{fmtArea(m.areaM2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5E6660] mt-1">
                    <span>{m.buildingType ? `Type: ${m.buildingType}` : 'Type: not provided'}{m.confidence != null ? ` • source confidence ${m.confidence}%` : ''}</span>
                    {diff != null && <span className="font-mono">{diff >= 0 ? '+' : ''}{Math.round(diff)} m² vs reconciled</span>}
                  </div>
                </button>
              );
            })}
            <div className="p-3 rounded-2xl border border-[#BDC9BF] bg-[#EAF2EA]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-[#1B2B1F]"><span className="w-3 h-3 rounded-full bg-[#3A5A40]" />Reconciled (union of sources)</span>
                <span className="font-mono font-bold text-[#1B2B1F]">{fmtArea(building.area)}</span>
              </div>
              <div className="text-[11px] text-[#5E6660] mt-1">
                Confidence {building.confidence}% • agreement {building.agreementScore == null ? 'n/a' : `${building.agreementScore}%`}
              </div>
            </div>
            {members.length === 0 && <p className="text-[#B07D3E]">Per-source geometry isn’t available for this entity.</p>}
          </div>
        </div>

        <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#1B2B1F] hover:bg-[#2D312E] text-white font-bold text-xs transition">Close</button>
        </div>
      </div>
    </div>
  );
};
