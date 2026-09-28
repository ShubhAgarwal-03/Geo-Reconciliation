import React, { useEffect, useState } from 'react';
import { sourceLabel, fmtArea, shortId } from '../data/sources';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { 
  X, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  Share2, 
  Copy, 
  Check, 
  Building2,
  FileDown
} from 'lucide-react';

interface DigitalLandEntityModalProps {
  building: BuildingEntity;
  onClose: () => void;
  language: Language;
  onViewSources: () => void;
}

export const DigitalLandEntityModal: React.FC<DigitalLandEntityModalProps> = ({
  building,
  onClose,
  language,
  onViewSources,
}) => {
  const t = translations[language];
  const [copied, setCopied] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('…');

  // Real SHA-256 over the entity id + reconciled geometry (integrity fingerprint).
  useEffect(() => {
    const data = new TextEncoder().encode(building.id + JSON.stringify(building.coordinates));
    crypto.subtle.digest('SHA-256', data).then((buf) => {
      setFingerprint(Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));
    }).catch(() => setFingerprint('unavailable'));
  }, [building.id, building.coordinates]);

  const props = () => ({
    id: building.id,
    areaM2: building.area,
    confidence: building.confidence,
    status: building.status,
    sources: building.sourceNames,
    sourceAgreementPct: building.agreementScore,
    sha256: fingerprint,
  });

  const handleCopyGeoJson = () => {
    const geojson = {
      type: "Feature",
      properties: props(),
      geometry: {
        type: "Polygon",
        coordinates: [building.coordinates.map(([lat, lng]) => [lng, lat])],
      },
    };

    navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadGeoJson = () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: props(),
          geometry: {
            type: "Polygon",
            coordinates: [building.coordinates.map(([lat, lng]) => [lng, lat])],
          },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LandLens_${shortId(building.id)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#3A5A40]" />
            <span className="font-serif font-bold text-sm text-[#1B2B1F] tracking-tight">
              Entity record card
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity Card Container */}
        <div className="p-6 overflow-y-auto">
          
          <div className="bg-[#1B2B1F] text-white rounded-3xl p-6 shadow-xl border border-[#2D4632] relative overflow-hidden">
            
            {/* Hologram / Security Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#2D4632]">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#BDC9BF] font-bold block">
                  LANDLENS • PROTOTYPE
                </span>
                <h3 className="text-sm font-serif font-bold text-[#FAF9F6] mt-0.5">
                  RECONCILED BUILDING ENTITY
                </h3>
              </div>
              <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-bold ${building.status === 'reconciled' ? 'bg-[#EAF2EA]/20 text-emerald-300 border-[#BDC9BF]/40' : 'bg-[#D9A05B]/20 text-[#D9A05B] border-[#D9A05B]/40'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{building.status === 'reconciled' ? '✓ VERIFIED' : building.status === 'review' ? 'PENDING REVIEW' : 'REJECTED'}</span>
              </div>
            </div>

            {/* Entity ID & Icon */}
            <div className="flex items-center justify-between my-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-serif font-bold text-white tracking-tight">
                  <span className="font-mono">#{shortId(building.id)}</span>
                </div>
                <div className="text-[10px] text-[#BDC9BF] font-mono mt-0.5 break-all max-w-[240px]">{building.id}</div>
              </div>
            </div>

            {/* Core attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#17231B] p-4 rounded-2xl border border-[#2D4632]">
              {[
                ['Area', fmtArea(building.area)],
                ['Sources', building.sourceNames.map(sourceLabel).join(', ')],
                ['Source agreement', building.agreementScore == null ? 'n/a (single source)' : `${building.agreementScore}%`],
                ['Confidence', `${building.confidence}%`],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">{k}</span>
                  <span className="text-sm font-serif font-bold text-white">{v}</span>
                </div>
              ))}
            </div>

            {/* Bottom Metadata & Hash */}
            <div className="mt-4 pt-3 border-t border-[#2D4632] text-[10px] text-[#BDC9BF] font-mono space-y-1">
              <div>SHA-256: <span className="text-[#A3B899] break-all">{fingerprint}</span></div>
              <div className="text-[#D9A05B]">Prototype record — not an official government document.</div>
            </div>

          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => {
              onClose();
              onViewSources();
            }}
            className="px-3 py-2 text-xs font-bold text-[#2D312E] hover:text-[#1B2B1F] transition"
          >
            View Sources
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyGeoJson}
              className="px-3.5 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3A5A40]" /> : <Copy className="w-3.5 h-3.5 text-[#5E6660]" />}
              <span>{copied ? "Copied GeoJSON" : "Copy GeoJSON"}</span>
            </button>

            <button
              onClick={handleDownloadGeoJson}
              className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GeoJSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
