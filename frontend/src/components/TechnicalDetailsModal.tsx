import React from 'react';
import { BuildingEntity, Language } from '../types';
import { X, Scale, Globe, Cpu } from 'lucide-react';
import { sourceLabel, fmtPct, shortId } from '../data/sources';

interface Props { building: BuildingEntity; onClose: () => void; language: Language }

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="p-3 flex items-center justify-between"><span className="font-medium text-[#2D312E]">{k}</span><span className="font-mono font-bold text-[#1B2B1F] text-right">{v}</span></div>
);

export const TechnicalDetailsModal: React.FC<Props> = ({ building, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
    <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44]">Match metrics</span>
          <h3 className="text-lg font-serif font-bold text-[#1B2B1F]">Entity #{shortId(building.id)}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-[#5E6660] hover:bg-[#F1F3F0] transition"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
        <div>
          <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2"><Scale className="w-4 h-4 text-[#3A5A40]" />Scores computed by the pipeline</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              ['Overall confidence', `${building.confidence}%`, 'Weighted: match + agreement + source confidence'],
              ['Avg match score', fmtPct(building.matchScore), building.matchScore == null ? 'Single source — not matched' : 'Across matched pairs'],
              ['Avg IoU agreement', fmtPct(building.agreementScore), building.agreementScore == null ? 'Single source — not matched' : 'Intersection over union'],
            ].map(([k, v, sub]) => (
              <div key={k} className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">{k}</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F] font-mono">{v}</span>
                <span className="text-[10px] text-[#5E6660] block">{sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-[#4A708B]" />Geometry</h4>
          <div className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl overflow-hidden divide-y divide-[#E8E6E1]">
            <Row k="Centroid (lat, lng)" v={`${building.centroid[0].toFixed(6)}, ${building.centroid[1].toFixed(6)}`} />
            <Row k="Vertices in reconciled polygon" v={building.coordinates.length} />
            <Row k="Served as" v="EPSG:4326 (matched internally in EPSG:32643)" />
            <Row k="Tile" v={building.tileId ?? '—'} />
          </div>
        </div>

        <div>
          <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-[#7E6E85]" />Members merged into this entity</h4>
          <div className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl overflow-hidden divide-y divide-[#E8E6E1]">
            {(building.members ?? []).map((m) => (
              <Row key={m.id} k={`${sourceLabel(m.source)} (feature ${m.id})`} v={`${m.areaM2 == null ? '—' : Math.round(m.areaM2) + ' m²'}${m.confidence != null ? ` • ${m.confidence}%` : ''}`} />
            ))}
            {!building.members && <div className="p-3 text-[#B07D3E]">Member features not loaded.</div>}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-[#1B2B1F] hover:bg-[#2D312E] text-white rounded-xl font-bold text-xs transition">Close</button>
      </div>
    </div>
  </div>
);
