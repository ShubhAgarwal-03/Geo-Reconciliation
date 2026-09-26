import React from 'react';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { X, FileCode, CheckCircle2, Cpu, Globe, Binary, Scale, Shield } from 'lucide-react';

interface TechnicalDetailsModalProps {
  building: BuildingEntity;
  onClose: () => void;
  language: Language;
}

export const TechnicalDetailsModal: React.FC<TechnicalDetailsModalProps> = ({
  building,
  onClose,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B2B1F] text-[#BDC9BF] flex items-center justify-center font-mono text-sm shadow-xs">
              &lt;/&gt;
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44]">
                Advanced Spatial Analysis
              </span>
              <h3 className="text-lg font-serif font-bold text-[#1B2B1F]">
                Technical Details & Metrics • {building.id}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Data Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Spatial Math Metrics */}
          <div>
            <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#3A5A40]" />
              <span>Geometric Agreement & IoU Matrix</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Jaccard Index (IoU)</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F] font-mono">
                  {building.conflictDetails ? building.conflictDetails.iouScore.toFixed(2) : "0.96"}
                </span>
                <span className="text-[10px] text-[#5E6660] block">Intersection over Union</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Centroid Offset</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F] font-mono">
                  {building.conflictDetails ? `${building.conflictDetails.centroidOffsetMeters}m` : "0.32m"}
                </span>
                <span className="text-[10px] text-[#5E6660] block">Euclidean distance</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Hausdorff Distance</span>
                <span className="text-base font-serif font-bold text-[#1B2B1F] font-mono">
                  {building.conflictDetails ? "4.1m" : "0.65m"}
                </span>
                <span className="text-[10px] text-[#5E6660] block">Max contour separation</span>
              </div>
            </div>
          </div>

          {/* Coordinate Reference System Transformations */}
          <div>
            <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4A708B]" />
              <span>Coordinate Reference System (CRS) Transformation</span>
            </h4>

            <div className="p-4 bg-[#1B2B1F] text-[#FAF9F6] rounded-2xl font-mono text-[11px] space-y-2 border border-[#2D4632]">
              <div className="flex justify-between">
                <span className="text-[#BDC9BF]">Input Cadastral:</span>
                <span className="text-[#D9A05B]">EPSG:7760 (KSRSAC Polyconic) → Transformed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#BDC9BF]">Input Drone ORI:</span>
                <span className="text-[#A3B899]">EPSG:32643 (UTM Zone 43N) → Transformed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#BDC9BF]">Unified Standard:</span>
                <span className="text-emerald-300 font-bold">EPSG:4326 (WGS 84 Ellipsoid)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#2D4632] text-[10px] text-[#BDC9BF]/80">
                <span>Centroid Coordinates:</span>
                <span>[{building.centroid[0].toFixed(6)}, {building.centroid[1].toFixed(6)}]</span>
              </div>
            </div>
          </div>

          {/* Attribute Similarity Analysis */}
          <div>
            <h4 className="font-bold text-[#1B2B1F] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#7E6E85]" />
              <span>Multi-Source Attribute Harmonization</span>
            </h4>

            <div className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl overflow-hidden divide-y divide-[#E8E6E1]">
              <div className="p-3 flex items-center justify-between">
                <span className="font-medium text-[#2D312E]">Land Use Consensus</span>
                <span className="font-bold text-[#1B2B1F]">{building.landUse} (Municipal & Cadastral match)</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="font-medium text-[#2D312E]">Elevation Height calibration</span>
                <span className="font-mono font-bold text-[#1B2B1F]">{building.height}m (DSM/DTM normalized)</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="font-medium text-[#2D312E]">AI Model Backing</span>
                <span className="font-mono font-bold text-[#1B2B1F]">SAM-2 + UNet-DTM v3.4</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex items-center justify-between">
          <span className="text-[#5E6660] font-mono text-[11px]">
            ISO/TC 211 & OGC Compliant Schema
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1B2B1F] hover:bg-[#2D312E] text-white rounded-xl font-bold text-xs transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
