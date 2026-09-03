import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  FileSpreadsheet, 
  FileBox, 
  Sparkles, 
  Plus, 
  Check, 
  FileUp,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { UploadedFile, Language } from '../types';
import { translations } from '../data/i18n';

interface DataUploadViewProps {
  uploadedFiles: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  language: Language;
  onGoToReconcile: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  uploadedFiles,
  onAddFile,
  language,
  onGoToReconcile,
}) => {
  const t = translations[language];

  const [selectedDataType, setSelectedDataType] = useState<string>("Drone / ORI");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dataTypes = [
    { id: "Drone / ORI", label: "Drone / ORI", icon: "🛰", desc: "Orthorectified high-res imagery (.tif, .ecw)" },
    { id: "Cadastral", label: "Cadastral", icon: "🗺", desc: "Revenue khasra parcel boundaries (.shp, .kml)" },
    { id: "Municipal GIS", label: "Municipal GIS", icon: "🏛", desc: "Urban local body property tax layers (.geojson)" },
    { id: "GNSS / Survey", label: "GNSS / Survey", icon: "📍", desc: "CORS RTK benchmark rover logs (.csv, .txt)" },
    { id: "Revenue Records", label: "Revenue Records", icon: "📜", desc: "RTC / RoR Jamabandi owner registries (.xlsx, .xml)" },
    { id: "Building Footprints", label: "Building Footprints", icon: "🏠", desc: "Vector building polygons (.gpkg, .shp)" },
    { id: "Other", label: "Other", icon: "📦", desc: "DSM/DTM LiDAR surface elevations (.las, .tif)" },
  ];

  const handleSimulatedUpload = (customName?: string) => {
    setIsUploading(true);
    setTimeout(() => {
      const newFile: UploadedFile = {
        id: `UPL-${Date.now().toString().slice(-4)}`,
        name: customName || `Survey_Dataset_${selectedDataType.replace(/[^a-zA-Z]/g, '')}_${new Date().toISOString().slice(0, 10)}.geojson`,
        dataType: selectedDataType,
        size: "34.2 MB",
        uploadDate: "Just now",
        status: "processed",
        crsDetected: "CRS Auto-Detected (EPSG:4326 normalized)",
        featuresCount: 124,
        errorCount: 0,
      };

      onAddFile(newFile);
      setIsUploading(false);
      setSuccessMessage(`Successfully ingested ${newFile.name}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4 sm:px-6">
      
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">
            {t.uploadData}
          </h2>
          <p className="text-sm text-[#5E6660] mt-1 max-w-2xl">
            Upload geospatial datasets from any source. The system automatically handles CRS alignment, projection transformations, and geometry normalization in the background.
          </p>
        </div>

        <button
          onClick={onGoToReconcile}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white font-bold text-sm shadow-sm transition active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.startReconciliation}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-[#1B2B1F] font-semibold text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#3A5A40]" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[11px] text-[#4A7C44] bg-white px-2 py-0.5 rounded-md font-bold border border-[#BDC9BF]/60">
            Ready for Reconciliation
          </span>
        </div>
      )}

      {/* Main Upload Area */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E6E1] shadow-sm space-y-6">
        
        {/* Step 1: Category Selector */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#5E6660] block mb-3">
            1. What are you uploading?
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {dataTypes.map((type) => {
              const isSelected = selectedDataType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedDataType(type.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#EAF2EA] border-[#3A5A40] text-[#1B2B1F] ring-2 ring-[#3A5A40]/20 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2D312E] hover:bg-[#F1F3F0]'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="font-bold text-xs leading-tight text-[#1B2B1F]">{type.label}</div>
                  <div className="text-[10px] text-[#5E6660] mt-1 leading-tight line-clamp-2">
                    {type.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Drag & Drop Zone */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#5E6660] block mb-3">
            2. Upload Files
          </label>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleSimulatedUpload(e.dataTransfer.files[0]?.name);
            }}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-[#3A5A40] bg-[#EAF2EA]/40'
                : 'border-[#E8E6E1] hover:border-[#BDC9BF] bg-[#FAF9F6]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#EAF2EA] text-[#3A5A40] flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2B1F]">
              Drop files here
            </h3>
            <p className="text-xs text-[#5E6660] mt-1">
              Supports GeoTIFF, Shapefile (.zip), GeoJSON, KML, CSV, GeoPackage, LAS/LAZ
            </p>

            <div className="my-4 flex items-center justify-center gap-3">
              <span className="h-px bg-[#E8E6E1] w-12" />
              <span className="text-xs font-bold text-[#A3A9A5]">or</span>
              <span className="h-px bg-[#E8E6E1] w-12" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2B1F] hover:bg-[#2D312E] text-white text-xs font-bold shadow-sm transition active:scale-95">
                <FolderOpen className="w-4 h-4" />
                <span>Choose Files</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSimulatedUpload(e.target.files[0].name);
                    }
                  }}
                />
              </label>

              <button
                onClick={() => handleSimulatedUpload()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] text-xs font-bold transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3A5A40]" />
                    <span>Processing CRS & Geometry...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5 text-[#5E6660]" />
                    <span>Load Demo {selectedDataType} Sample</span>
                  </>
                )}
              </button>
            </div>

            {/* Smart Backend Promise Callout */}
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[#5E6660] text-[11px] font-medium border border-[#E8E6E1]">
              <Check className="w-3.5 h-3.5 text-[#3A5A40]" />
              <span>Automatic CRS transformation & schema harmonization enabled (No technical CRS setup required)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Uploaded Files Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#1B2B1F]">
              Active Project Ingestion Records
            </h3>
            <span className="text-xs text-[#5E6660]">
              {uploadedFiles.length} multi-source datasets loaded for Ward 112 Pilot Zone
            </span>
          </div>

          <span className="text-xs font-bold text-[#4A7C44] bg-[#EAF2EA] px-3 py-1 rounded-full border border-[#BDC9BF]/50">
            Harmonization Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1F3F0] text-[#A3A9A5] font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Filename</th>
                <th className="pb-3">Data Type</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Uploaded</th>
                <th className="pb-3">Processing Status</th>
                <th className="pb-3">Features</th>
                <th className="pb-3 text-right pr-2">CRS Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F0] font-medium text-[#2D312E]">
              {uploadedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-[#FAF9F6] transition">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2">
                      <FileBox className="w-4 h-4 text-[#3A5A40] shrink-0" />
                      <span className="font-bold text-[#1B2B1F]">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="font-semibold text-[#2D312E] bg-[#F1F3F0] px-2 py-0.5 rounded-md border border-[#E8E6E1]/50">
                      {file.dataType}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[#5E6660]">{file.size}</td>
                  <td className="py-3.5 text-[#5E6660]">{file.uploadDate}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF2EA] text-[#4A7C44] border border-[#BDC9BF]/60">
                      <CheckCircle2 className="w-3 h-3 text-[#3A5A40]" />
                      <span>{file.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-[#1B2B1F]">{file.featuresCount}</td>
                  <td className="py-3.5 text-right pr-2">
                    <span className="text-[11px] text-[#5E6660] font-mono">
                      {file.crsDetected}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
