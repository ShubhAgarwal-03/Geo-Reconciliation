import React, { useState } from 'react';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { 
  X, 
  Download, 
  QrCode, 
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

  const handleCopyGeoJson = () => {
    const geojson = {
      type: "Feature",
      properties: {
        id: building.id,
        surveyNumber: building.surveyNumber,
        wardNo: building.wardNo,
        zone: building.zone,
        areaM2: building.area,
        landUse: building.landUse,
        heightMeters: building.height,
        confidence: building.confidence,
        status: building.status,
        ecosystem: "NAKSHA / Urban Land Records",
        hash: `0x7F${building.id.replace(/[^0-9]/g, '')}D9C2A`,
      },
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
          properties: {
            id: building.id,
            surveyNumber: building.surveyNumber,
            areaM2: building.area,
            landUse: building.landUse,
            confidence: building.confidence,
            verified: true,
          },
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
    a.download = `NAKSHA_${building.id}_Reconciled.geojson`;
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
              NAKSHA Digital Land Record Identity
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
                  GOVERNMENT OF INDIA • NAKSHA PORTAL
                </span>
                <h3 className="text-sm font-serif font-bold text-[#FAF9F6] mt-0.5">
                  URBAN LAND ENTITY CERTIFICATE
                </h3>
              </div>
              <div className="flex items-center gap-1.5 bg-[#EAF2EA]/20 text-emerald-300 border border-[#BDC9BF]/40 px-2.5 py-1 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>✓ VERIFIED</span>
              </div>
            </div>

            {/* Entity ID & Icon */}
            <div className="flex items-center justify-between my-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-serif font-bold text-white tracking-tight">
                  <span>🏛️</span>
                  <span>{building.id}</span>
                </div>
                <div className="text-xs text-[#BDC9BF] font-mono mt-0.5">
                  Survey No: <span className="text-white font-bold">{building.surveyNumber}</span>
                </div>
              </div>

              {/* Simulated QR Code Stamp */}
              <div className="w-16 h-16 bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
                <QrCode className="w-full h-full text-[#1B2B1F]" />
              </div>
            </div>

            {/* Core Certificate Attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#17231B] p-4 rounded-2xl border border-[#2D4632]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Area</span>
                <span className="text-base font-serif font-bold text-white font-mono">{building.area} m²</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Land Use</span>
                <span className="text-base font-serif font-bold text-white">{building.landUse}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Height</span>
                <span className="text-base font-serif font-bold text-white font-mono">{building.height} m ({building.floors} fl)</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Survey Sources</span>
                <span className="text-base font-serif font-bold text-[#A3B899] font-mono">{building.sourcesCount} Datasets</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Source Agreement</span>
                <span className="text-base font-serif font-bold text-[#A3B899] font-mono">{building.agreementScore}%</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#BDC9BF] block">Confidence Score</span>
                <span className="text-base font-serif font-bold text-emerald-300 font-mono">{building.confidence}%</span>
              </div>
            </div>

            {/* Bottom Metadata & Hash */}
            <div className="mt-4 pt-3 border-t border-[#2D4632] flex items-center justify-between text-[10px] text-[#BDC9BF] font-mono">
              <div>
                Last Updated: <span className="text-white font-bold">{building.lastUpdated}</span>
              </div>
              <div>
                Hash: <span className="text-[#A3B899]">0x7F{building.id.replace(/[^0-9]/g, '')}D9C</span>
              </div>
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
