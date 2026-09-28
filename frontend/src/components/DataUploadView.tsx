import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, FileBox, Sparkles, RefreshCw, FolderOpen, Clock, Database } from 'lucide-react';
import { UploadedFile, Language, DatasetStats } from '../types';
import { uploadFile } from '../api/geoReconciliationClient';
import { translations } from '../data/i18n';
import { DISTRICT_LABEL } from '../config';
import { sourceLabel, sourceColor } from '../data/sources';

interface Props {
  uploadedFiles: UploadedFile[];
  stats: DatasetStats | null;
  onAddFile: (file: UploadedFile) => void;
  onRunReconcile: (file: UploadedFile) => void;
  language: Language;
}

export const DataUploadView: React.FC<Props> = ({ uploadedFiles, stats, onAddFile, onRunReconcile, language }) => {
  const t = translations[language];
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const res = await uploadFile(file);
      onAddFile({
        id: `UPL-${Date.now()}`,
        name: res.filename,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: Date.now(),
        storedPath: res.stored_path,
      });
      setMessage({ ok: true, text: `Uploaded ${res.filename}. You can now run reconciliation with it.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const raw = stats ? Object.entries(stats.rawFeaturesBySource) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4 sm:px-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">{t.uploadData}</h2>
        <p className="text-sm text-[#5E6660] mt-1 max-w-2xl">
          You don’t need your own files to explore LandLens. The pilot area below is already reconciled and browsable on the Map tab. Upload is optional, for adding your own footprints.
        </p>
      </div>

      {/* Baseline dataset (real numbers) */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
        <div className="flex items-center gap-2 mb-1"><Database className="w-5 h-5 text-[#3A5A40]" /><h3 className="text-base font-serif font-bold text-[#1B2B1F]">Included dataset</h3></div>
        <p className="text-xs text-[#5E6660]">{DISTRICT_LABEL}</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]"><span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Reconciled entities</span><span className="text-lg font-serif font-bold text-[#1B2B1F]">{stats ? stats.totalEntities.toLocaleString() : '—'}</span></div>
          {raw.map(([s, n]) => (
            <div key={s} className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]"><span className="text-[10px] uppercase font-bold text-[#A3A9A5] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: sourceColor(s) }} />{sourceLabel(s)}</span><span className="text-lg font-serif font-bold text-[#1B2B1F]">{n.toLocaleString()}</span></div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E6E1] shadow-sm space-y-4">
        <h3 className="text-base font-serif font-bold text-[#1B2B1F]">Add your own data (optional)</h3>

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-[#FFF9F0] border border-[#FDEACD] text-xs text-[#8F632D]">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Reconciling your own file runs the full matching pipeline and <strong>can take several minutes</strong>. The page will keep checking progress; you can keep exploring the map meanwhile.</span>
        </div>

        {message && (
          <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${message.ok ? 'bg-[#EAF2EA] border-[#BDC9BF] text-[#1B2B1F]' : 'bg-[#FDF2F0] border-[#F8D7DA] text-[#902A1A]'}`}>
            {message.ok && <CheckCircle2 className="w-4 h-4 text-[#3A5A40]" />}<span>{message.text}</span>
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${isDragging ? 'border-[#3A5A40] bg-[#EAF2EA]/40' : 'border-[#E8E6E1] hover:border-[#BDC9BF] bg-[#FAF9F6]'}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#EAF2EA] text-[#3A5A40] flex items-center justify-center mx-auto mb-4">
            {isUploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
          </div>
          <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2B1F]">{isUploading ? 'Uploading…' : 'Drop a file here'}</h3>
          <p className="text-xs text-[#5E6660] mt-1">Building polygons as GeoJSON (.geojson, .json) or a zipped Shapefile (.zip)</p>
          <label className={`mt-5 cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2B1F] hover:bg-[#2D312E] text-white text-xs font-bold transition active:scale-95 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <FolderOpen className="w-4 h-4" /><span>Choose file</span>
            <input type="file" accept=".geojson,.json,.zip" className="hidden" disabled={isUploading}
              onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />
          </label>
        </div>
      </div>

      {/* Files uploaded in this session */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
          <h3 className="text-base font-serif font-bold text-[#1B2B1F] mb-1">Uploaded this session</h3>
          <p className="text-[11px] text-[#A3A9A5] mb-4">Feature count and CRS are read when the pipeline runs.</p>
          <div className="divide-y divide-[#F1F3F0] text-xs">
            {uploadedFiles.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0"><FileBox className="w-4 h-4 text-[#3A5A40] shrink-0" /><span className="font-bold text-[#1B2B1F] truncate">{f.name}</span><span className="font-mono text-[#5E6660]">{f.size}</span></div>
                <button onClick={() => onRunReconcile(f)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white font-bold transition active:scale-95 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" /><span>{t.startReconciliation}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
