import React from 'react';
import { BuildingEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { X, History, Clock, UserCheck, ShieldCheck } from 'lucide-react';

interface HistoryModalProps {
  building: BuildingEntity;
  onClose: () => void;
  language: Language;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  building,
  onClose,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#3A5A40]" />
            <h3 className="font-serif font-bold text-[#1B2B1F] text-sm">
              Audit History Trail • {building.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="relative pl-6 border-l-2 border-[#3A5A40]/30 space-y-6">
            {building.history.map((log, index) => (
              <div key={index} className="relative">
                <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#3A5A40] border-2 border-white shadow-xs" />
                <span className="text-[10px] font-mono text-[#A3A9A5] block mb-0.5">{log.date}</span>
                <h4 className="font-bold text-[#1B2B1F]">{log.action}</h4>
                <div className="text-[#5E6660] text-[11px] mt-0.5">
                  Actor: <span className="font-semibold text-[#2D312E]">{log.actor}</span>
                </div>
                <p className="text-[#2D312E] mt-1 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E8E6E1]">
                  {log.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1B2B1F] hover:bg-[#2D312E] text-white font-bold text-xs transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
