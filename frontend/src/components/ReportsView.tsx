import React, { useState } from 'react';
import { 
  BuildingEntity, 
  Language, 
  ReconciliationStats 
} from '../types';
import { translations } from '../data/i18n';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Sparkles,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';

interface ReportsViewProps {
  buildings: BuildingEntity[];
  stats: ReconciliationStats;
  language: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  buildings,
  stats,
  language,
}) => {
  const t = translations[language];
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExportReport = () => {
    const reportContent = `
NAKSHA URBAN LAND DATA RECONCILIATION REPORT
Date: 03 September 2026
Zone: Ward 112 - Domlur, Bengaluru Urban
--------------------------------------------------
Total Land Entities Processed: ${stats.totalBuildings}
Harmonized & Matched: ${stats.matched}
Average Confidence: ${stats.averageConfidence}%
Requires Surveyor Review: ${stats.requiresReview}
Conflicts Detected: ${stats.conflictsDetected}
Auto-Resolved Conflicts: ${stats.autoResolved}

Source Agreement Summary:
- Drone ORI 5cm GSD: 96.2% consensus
- Revenue Cadastral Khasra: 94.8% consensus
- Municipal Tax Property GIS: 89.4% consensus
- SAM-2 AI Extraction: 93.1% consensus

Output Standard: Survey of India NAKSHA Unified CRS EPSG:4326
--------------------------------------------------
Certified by: Er. Rajesh Sharma, Zonal GIS Surveyor
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NAKSHA_Ward112_Reconciliation_Summary_2026.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess("Downloaded official reconciliation summary report!");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleExportGeoJson = () => {
    const geojson = {
      type: "FeatureCollection",
      name: "NAKSHA_Ward112_Reconciled_Parcels",
      features: buildings.map(b => ({
        type: "Feature",
        properties: {
          id: b.id,
          surveyNumber: b.surveyNumber,
          areaM2: b.area,
          landUse: b.landUse,
          heightMeters: b.height,
          confidence: b.confidence,
          status: b.status,
          verified: b.status === 'reconciled',
        },
        geometry: {
          type: "Polygon",
          coordinates: [b.coordinates.map(([lat, lng]) => [lng, lat])],
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NAKSHA_Ward112_All_Parcels.geojson`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess("Exported complete Ward 112 GeoJSON dataset!");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  // Confidence distribution brackets
  const highConfCount = buildings.filter(b => b.confidence >= 90).length;
  const mediumConfCount = buildings.filter(b => b.confidence >= 70 && b.confidence < 90).length;
  const lowConfCount = buildings.filter(b => b.confidence < 70).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4 sm:px-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C44] bg-[#EAF2EA] px-2.5 py-0.5 rounded-full border border-[#BDC9BF]/60">
              Executive Analytics
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight mt-1">
            Reconciliation & Audit Reports
          </h2>
          <p className="text-sm text-[#5E6660] mt-0.5">
            Statistical distribution of multi-source confidence scores, spatial conflict categories, and validation results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F3F0] border border-[#E8E6E1] text-[#2D312E] text-xs font-bold transition shadow-2xs"
          >
            <FileText className="w-4 h-4 text-[#5E6660]" />
            <span>Export Report</span>
          </button>

          <button
            onClick={handleExportGeoJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export GeoJSON</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-[#1B2B1F] font-semibold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#3A5A40]" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Top 5 Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E8E6E1] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Total Entities</span>
          <span className="text-2xl font-serif font-bold text-[#1B2B1F] mt-1 block">{stats.totalBuildings}</span>
          <span className="text-[11px] text-[#5E6660]">Parcels analyzed</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8E6E1] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Matched Entities</span>
          <span className="text-2xl font-serif font-bold text-[#4A7C44] mt-1 block">{stats.matched}</span>
          <span className="text-[11px] text-[#4A7C44] font-semibold">88.4% auto-verified</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8E6E1] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Conflicts Detected</span>
          <span className="text-2xl font-serif font-bold text-[#D66D54] mt-1 block">{stats.conflictsDetected}</span>
          <span className="text-[11px] text-[#D66D54] font-semibold">31 auto-resolved</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8E6E1] shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Verified Entities</span>
          <span className="text-2xl font-serif font-bold text-[#3A5A40] mt-1 block">{stats.matched}</span>
          <span className="text-[11px] text-[#3A5A40] font-semibold">Ready for Registry</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E8E6E1] shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Average Confidence</span>
          <span className="text-2xl font-serif font-bold text-[#1B2B1F] mt-1 block">{stats.averageConfidence}%</span>
          <span className="text-[11px] text-[#4A7C44] font-semibold">+12% post-reconcile</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Confidence Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-bold text-[#1B2B1F]">Confidence Distribution</h3>
              <span className="text-xs text-[#5E6660]">Parcels grouped by reliability score</span>
            </div>
            <BarChart3 className="w-5 h-5 text-[#3A5A40]" />
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#1B2B1F] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3A5A40]"></span>
                  <span>90–100% (High Confidence / Verified)</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">{highConfCount} buildings ({Math.round((highConfCount / buildings.length) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A5A40] rounded-full" style={{ width: `${(highConfCount / buildings.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#1B2B1F] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9A05B]"></span>
                  <span>70–89% (Review Recommended)</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">{mediumConfCount} buildings ({Math.round((mediumConfCount / buildings.length) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#D9A05B] rounded-full" style={{ width: `${(mediumConfCount / buildings.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#1B2B1F] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D66D54]"></span>
                  <span>&lt;70% (Significant Conflict)</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">{lowConfCount} buildings ({Math.round((lowConfCount / buildings.length) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#D66D54] rounded-full" style={{ width: `${(lowConfCount / buildings.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Source Agreement Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-bold text-[#1B2B1F]">Source Agreement Matrix</h3>
              <span className="text-xs text-[#5E6660]">Average alignment with unified ground truth</span>
            </div>
            <PieChart className="w-5 h-5 text-[#3A5A40]" />
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#2D312E] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9A05B]"></span>
                  <span>Drone ORI (5cm GSD)</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">96.4% IoU</span>
              </div>
              <div className="w-full h-2.5 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#D9A05B] rounded-full" style={{ width: "96.4%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#2D312E] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7D6D8A]"></span>
                  <span>Revenue Cadastral (Khasra)</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">94.8% IoU</span>
              </div>
              <div className="w-full h-2.5 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#7D6D8A] rounded-full" style={{ width: "94.8%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#2D312E] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3A5A40]"></span>
                  <span>AI SAM-2 Extraction</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">93.2% IoU</span>
              </div>
              <div className="w-full h-2.5 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#3A5A40] rounded-full" style={{ width: "93.2%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[#2D312E] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A6D7C]"></span>
                  <span>Municipal Property Tax GIS</span>
                </span>
                <span className="font-mono font-bold text-[#1B2B1F]">89.1% IoU</span>
              </div>
              <div className="w-full h-2.5 bg-[#F1F3F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#4A6D7C] rounded-full" style={{ width: "89.1%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Conflict Categories */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm space-y-4">
          <h3 className="text-base font-serif font-bold text-[#1B2B1F]">Conflict Classification</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="font-medium text-[#2D312E]">Balcony / Roof Eave Overhang</span>
              <span className="font-mono font-bold text-[#1B2B1F]">22 cases (52%)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="font-medium text-[#2D312E]">Cadastral Digitization Scale Offset</span>
              <span className="font-mono font-bold text-[#1B2B1F]">11 cases (26%)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="font-medium text-[#2D312E]">Road Buffer Encroachment Notice</span>
              <span className="font-mono font-bold text-[#D66D54]">6 cases (14%)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="font-medium text-[#2D312E]">Unassessed Rooftop Structure</span>
              <span className="font-mono font-bold text-[#B07D3E]">3 cases (8%)</span>
            </div>
          </div>
        </div>

        {/* Chart 4: Reconciliation Pipeline Speed */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm space-y-4">
          <h3 className="text-base font-serif font-bold text-[#1B2B1F]">Pipeline Performance</h3>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1]">
              <span className="text-[10px] text-[#A3A9A5] font-bold uppercase block">Processing Throughput</span>
              <span className="text-lg font-serif font-bold text-[#1B2B1F] mt-0.5 block">142 parcels/sec</span>
              <span className="text-[10px] text-[#4A7C44] font-semibold">Multi-core GPU accelerated</span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1]">
              <span className="text-[10px] text-[#A3A9A5] font-bold uppercase block">Auto-Resolution Rate</span>
              <span className="text-lg font-serif font-bold text-[#4A7C44] mt-0.5 block">73.8%</span>
              <span className="text-[10px] text-[#5E6660] font-medium">Without human intervention</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-xs text-[#1B2B1F] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3A5A40] shrink-0" />
            <span>Meets Survey of India Accuracy Standards (Class A Urban Standard)</span>
          </div>
        </div>

      </div>

      {/* Section 16: Future-Ready Data Types */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E6E1] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#1B2B1F]">
              Future-Ready Data Type Architecture
            </h3>
            <p className="text-xs text-[#5E6660]">
              Extensible schema designed to integrate upcoming NAKSHA urban infrastructure modules
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#5E6660] bg-[#F1F3F0] px-2.5 py-1 rounded-full">
            Modular Roadmap
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {[
            { name: "Building Footprints", ready: true },
            { name: "Cadastral Parcels", ready: true },
            { name: "Road Network", ready: true },
            { name: "GNSS / CORS", ready: true },
            { name: "DSM / DTM Surfaces", ready: true },
            { name: "Underground Utilities", ready: false },
            { name: "Temporal Change Detection", ready: false },
            { name: "Ground Truthing App API", ready: false },
            { name: "Property Title Blockchain", ready: false },
            { name: "3D Digital Twin Mesh", ready: false },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border flex items-center justify-between ${
                item.ready
                  ? 'bg-[#EAF2EA]/50 border-[#BDC9BF] text-[#1B2B1F] font-bold'
                  : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#A3A9A5] font-medium'
              }`}
            >
              <span>{item.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                item.ready ? 'bg-[#3A5A40] text-white' : 'bg-[#F1F3F0] text-[#5E6660]'
              }`}>
                {item.ready ? "Active" : "Coming Soon"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
