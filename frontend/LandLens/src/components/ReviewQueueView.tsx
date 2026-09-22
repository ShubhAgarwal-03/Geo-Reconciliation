import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  MapPin, 
  Eye, 
  Check, 
  Layers, 
  Loader2, 
  Tag,
  RefreshCw,
  Copy
} from 'lucide-react';
import { CanonicalEntity, Language } from '../types';
import { translations } from '../data/i18n';
import { api } from '../services/api';

interface ReviewQueueViewProps {
  onSelectBuildingOnMap: (building: CanonicalEntity) => void;
  language: Language;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  onSelectBuildingOnMap,
  language,
}) => {
  const t = translations[language] || {
    reviewRequired: "Human-in-the-Loop Review Queue",
    reconciled: "Reconciled",
    all: "All Cases",
  };

  const [queue, setQueue] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    const clean = text.normalize('NFKD').trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchQueue = () => {
    setLoading(true);
    api.getReviewQueue()
      .then((data) => {
        setQueue(data);
      })
      .catch((err) => {
        console.warn('Could not load review queue:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleResolve = async (canonicalUid: string) => {
    setResolvingId(canonicalUid);
    try {
      await api.resolveReview(canonicalUid);
      setQueue((prev) => prev.filter((item) => item.canonical_uid !== canonicalUid));
      setActionMessage(`Marked ${canonicalUid} as verified and resolved.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e) {
      console.error('Failed to resolve entity:', e);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.normalize('NFKD').trim().toLowerCase();
      return (
        item.canonical_uid.toLowerCase().includes(q) ||
        (item.bhu_aadhar && item.bhu_aadhar.toLowerCase().includes(q)) ||
        item.sources.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">
              {t.reviewRequired}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF9F0] text-[#B07D3E] border border-[#FDEACD]">
              {queue.length} Flagged
            </span>
          </div>
          <p className="text-xs text-[#5E6660] mt-1">
            Parcels and buildings with single-source footprints or boundary discrepancies flagged for operator sign-off.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E6E1] text-[#1B2B1F] hover:bg-[#F8F9F8] text-xs font-bold rounded-xl transition shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5E6660] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="bg-[#EAF2EA] border border-[#BDC9BF] text-[#4A7C44] px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#4A7C44] shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-[#E8E6E1] shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5E6660] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by Bhu-Aadhar (e.g. 2920TDR1W7B52E), UID, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF9F6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3A5A40] text-[#1B2B1F]"
          />
        </div>
        <div className="text-xs font-semibold text-[#5E6660] pr-2">
          Showing {filteredQueue.length} of {queue.length}
        </div>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#5E6660]">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A5A40] mb-2" />
          <span className="text-xs font-semibold">Querying PostGIS review queue...</span>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E8E6E1] p-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2EA] text-[#3A5A40] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#1B2B1F]">Review Queue is Clean</h3>
          <p className="text-xs text-[#5E6660] mt-1 max-w-md mx-auto">
            All spatial building footprints have met the reconciliation threshold or have been approved by operators.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQueue.map((item) => {
            const conf = Math.round(item.confidence_score * 100);
            const bhu = item.bhu_aadhar || item.canonical_uid.slice(0, 14);
            const isCopied = copiedId === item.canonical_uid;
            return (
              <div
                key={item.canonical_uid}
                className="bg-white rounded-2xl border border-[#E8E6E1] p-4 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="bg-[#3A5A40] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Bhu-Aadhar
                      </span>
                      <span className="font-mono font-bold text-xs text-[#1B2B1F]">
                        {bhu}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.canonical_uid, bhu)}
                        className={`p-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                          isCopied
                            ? 'bg-[#EAF2EA] text-[#4A7C44]'
                            : 'hover:bg-[#EAF2EA] text-[#5E6660] hover:text-[#1B2B1F]'
                        }`}
                        title="Copy pure ASCII Bhu-Aadhar"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-[#4A7C44]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-[#5E6660] truncate max-w-[200px]">
                      UID: {item.canonical_uid}
                    </div>
                    <div className="text-[11px] text-[#5E6660] mt-0.5">
                      Area: {item.area_m2 ? `${Math.round(item.area_m2)} m²` : 'N/A'} • {item.source_count} Sources
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9F0] text-[#B07D3E] border border-[#FDEACD]">
                    {conf}% Confidence
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.sources.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF9F6] text-[#5E6660] border border-[#E8E6E1]"
                    >
                      {s.toUpperCase().replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F1F3F0]">
                  <button
                    onClick={() => onSelectBuildingOnMap(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F1F3F0] text-[#1B2B1F] text-xs font-bold transition border border-[#E8E6E1]"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#3A5A40]" />
                    <span>Inspect on Map</span>
                  </button>

                  <button
                    onClick={() => handleResolve(item.canonical_uid)}
                    disabled={resolvingId === item.canonical_uid}
                    className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold transition shadow-2xs disabled:opacity-50"
                  >
                    {resolvingId === item.canonical_uid ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
