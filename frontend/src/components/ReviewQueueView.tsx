import React, { useEffect, useState } from 'react';
import { BuildingEntity, BuildingStatus, Language, MemberFeature } from '../types';
import { translations } from '../data/i18n';
import { AlertTriangle, CheckCircle2, MapPin, Eye, Check, X, Loader2, ThumbsDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { resolveEntity, fetchEntityMembers } from '../api/geoReconciliationClient';
import { adaptMember } from '../api/adapter';
import { sourceLabel, sourceColor, shortId, fmtArea } from '../data/sources';
import { FootprintOverlay } from './FootprintOverlay';

interface ReviewQueueViewProps {
  /** Entities from GET /review-queue (lowest confidence first). */
  buildings: BuildingEntity[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectBuildingOnMap: (building: BuildingEntity) => void;
  language: Language;
  onResolved: (id: string, status: BuildingStatus) => void;
}

const reasonFor = (b: BuildingEntity) =>
  b.sourcesCount > 1
    ? {
        title: 'Sources overlap but disagree',
        text: `Matched across ${b.sourcesCount} sources with ${b.agreementScore ?? '—'}% geometric agreement and a ${b.matchScore ?? '—'}% match score — below the auto-accept threshold.`,
      }
    : {
        title: 'Seen by one source only',
        text: 'No second source confirms this footprint, so it could not be cross-validated. Confidence relies on the single source’s own score.',
      };

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  buildings, loading, error, onRetry, onSelectBuildingOnMap, language, onResolved,
}) => {
  const t = translations[language];
  const reviewItems = buildings.filter((b) => b.status === 'review');
  const multiCount = reviewItems.filter((b) => b.sourcesCount > 1).length;
  const singleCount = reviewItems.length - multiCount;

  const [activeTab, setActiveTab] = useState<'all' | 'multi' | 'single'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<BuildingEntity | null>(null);
  const [members, setMembers] = useState<MemberFeature[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chosenSource, setChosenSource] = useState<string>('');

  useEffect(() => {
    setMembers(null); setMembersError(null); setChosenSource('');
    if (!selected) return;
    let cancelled = false;
    fetchEntityMembers(selected.id)
      .then((m) => { if (!cancelled) setMembers(m.map(adaptMember)); })
      .catch((e) => { if (!cancelled) setMembersError(e instanceof Error ? e.message : 'failed'); });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const filtered = reviewItems.filter((b) => {
    if (activeTab === 'multi' && b.sourcesCount < 2) return false;
    if (activeTab === 'single' && b.sourcesCount !== 1) return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || b.id.toLowerCase().includes(q);
  });

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(null), 4000); };

  const act = async (kind: 'accept' | 'source' | 'reject') => {
    if (!selected) return;
    const id = selected.id;
    setIsSubmitting(true);
    try {
      if (kind === 'accept') {
        await resolveEntity(id, { status: 'approved' });
        onResolved(id, 'reconciled');
        flash(`Accepted #${shortId(id)} (${fmtArea(selected.area)})`);
        try { confetti({ particleCount: 40, spread: 50 }); } catch { /* decoration only */ }
      } else if (kind === 'source') {
        await resolveEntity(id, { status: 'edited', note: `source_override:${chosenSource}` });
        onResolved(id, 'reconciled');
        flash(`Recorded source override (${sourceLabel(chosenSource)}) for #${shortId(id)}`);
      } else {
        await resolveEntity(id, { status: 'rejected' });
        onResolved(id, 'conflict');
        flash(`Rejected #${shortId(id)}`);
      }
      setSelected(null);
    } catch (e) {
      flash(e instanceof Error ? `Failed: ${e.message}` : 'Failed to save decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceOptions = Array.from(new Set((members ?? []).map((m) => m.source)));

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B2B1F] tracking-tight">{t.reviewRequired}</h2>
            <span className="text-[11px] font-bold bg-[#FFF9F0] text-[#B07D3E] border border-[#F3E1C6] px-3 py-0.5 rounded-full">
              {reviewItems.length}{reviewItems.length >= 200 ? '+' : ''} cases
            </span>
          </div>
          <p className="text-sm text-[#5E6660] mt-1">Entities the pipeline scored below its confidence threshold — lowest confidence first.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by ID…"
            className="bg-white px-3 py-2 rounded-xl text-xs border border-[#E8E6E1] focus:outline-none focus:ring-2 focus:ring-[#3A5A40]"
          />
          <div className="bg-[#F1F3F0] p-1 rounded-xl flex text-xs font-bold border border-[#E8E6E1]">
            {([['all', `All (${reviewItems.length})`], ['multi', `Sources disagree (${multiCount})`], ['single', `Single source (${singleCount})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === k ? 'bg-white text-[#1B2B1F] shadow-2xs' : 'text-[#5E6660] hover:text-[#1B2B1F]'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-[#EAF2EA] border border-[#BDC9BF] text-[#1B2B1F] font-semibold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#3A5A40]" /><span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#F8D7DA] text-xs text-[#902A1A] flex items-center justify-between">
          <span>Couldn’t load the review queue: {error}</span>
          {onRetry && <button onClick={onRetry} className="px-3 py-1 rounded-lg bg-[#3A5A40] text-white font-bold">Retry</button>}
        </div>
      )}
      {loading && <div className="flex items-center gap-2 text-xs text-[#5E6660]"><Loader2 className="w-4 h-4 animate-spin" /> Loading review queue…</div>}
      {!loading && !error && reviewItems.length === 0 && (
        <div className="text-center py-16 text-sm text-[#5E6660]">Nothing waiting for review. 🎉</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => {
          const multi = b.sourcesCount > 1;
          const r = reasonFor(b);
          return (
            <div key={b.id} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${multi ? 'border-[#F8D7DA] hover:border-[#D66D54]' : 'border-[#F3E1C6] hover:border-[#D9A05B]'}`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${multi ? 'bg-[#FDF2F0] text-[#D66D54] border border-[#F8D7DA]' : 'bg-[#FFF9F0] text-[#B07D3E] border border-[#F3E1C6]'}`}>
                    <AlertTriangle className="w-3 h-3" />{multi ? 'Sources disagree' : 'Single source'}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#5E6660]">#{shortId(b.id)}</span>
                </div>
                <p className="text-xs text-[#5E6660]">{b.sourceNames.map(sourceLabel).join(' + ')} • {fmtArea(b.area)}</p>
                <div className="my-3 p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs">
                  <span className="font-semibold block text-[#1B2B1F]">{r.title}</span>
                  <p className="text-[11px] text-[#5E6660] mt-1 line-clamp-3">{r.text}</p>
                </div>
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-[11px] font-semibold text-[#5E6660]">
                    <span>Confidence</span><span className={`font-mono font-bold ${multi ? 'text-[#D66D54]' : 'text-[#B07D3E]'}`}>{b.confidence}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F3F0] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${multi ? 'bg-[#D66D54]' : 'bg-[#D9A05B]'}`} style={{ width: `${b.confidence}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F3F0]">
                <button onClick={() => onSelectBuildingOnMap(b)} className="flex items-center justify-center gap-1 px-3 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] text-[#2D312E] rounded-xl text-xs font-bold transition">
                  <MapPin className="w-3.5 h-3.5" /><span>View on map</span>
                </button>
                <button onClick={() => setSelected(b)} className={`flex items-center justify-center gap-1 px-3 py-2 text-white rounded-xl text-xs font-bold transition ${multi ? 'bg-[#D66D54] hover:bg-[#B8533D]' : 'bg-[#B07D3E] hover:bg-[#8F632D]'}`}>
                  <Eye className="w-3.5 h-3.5" /><span>Review</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#B07D3E]">Flagged for review</span>
                <h3 className="text-xl font-serif font-bold text-[#1B2B1F]">Entity #{shortId(selected.id)}</h3>
              </div>
              <button onClick={() => setSelected(null)} disabled={isSubmitting} className="p-2 rounded-xl text-[#5E6660] hover:bg-[#F1F3F0] transition disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#F3E1C6] text-xs">
                <span className="font-bold text-sm block mb-1 text-[#1B2B1F]">{reasonFor(selected).title}</span>
                <p className="text-[#5E6660] leading-relaxed">{reasonFor(selected).text}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#E8E6E1]">
                  <span className="text-xs font-bold text-[#5E6660] uppercase tracking-wider block mb-3">Source geometries</span>
                  {!members && !membersError && <div className="flex items-center gap-2 text-xs text-[#5E6660]"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>}
                  {membersError && <p className="text-xs text-[#B07D3E]">Couldn’t load source geometry: {membersError}</p>}
                  <div className="space-y-2 text-xs">
                    {(members ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E8E6E1]">
                        <span className="flex items-center gap-2 font-semibold text-[#2D312E]"><span className="w-3 h-3 rounded-full" style={{ background: sourceColor(m.source) }} />{sourceLabel(m.source)}</span>
                        <span className="font-mono font-bold text-[#1B2B1F]">{fmtArea(m.areaM2)}</span>
                      </div>
                    ))}
                  </div>
                  {members && members.length > 0 && (
                    <div className="mt-3 h-44 bg-white rounded-xl border border-[#E8E6E1] p-1">
                      <FootprintOverlay building={{ ...selected, members }} mode="both" />
                    </div>
                  )}
                </div>

                <div className="bg-[#EAF2EA] rounded-2xl p-4 border border-[#BDC9BF]">
                  <span className="text-xs font-bold text-[#3A5A40] uppercase tracking-wider block mb-3">Pipeline result</span>
                  <div className="p-3 rounded-xl bg-white border border-[#BDC9BF] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#4A7C44] block">Reconciled area</span>
                    <div className="text-2xl font-serif font-bold text-[#1B2B1F] my-1">{fmtArea(selected.area)}</div>
                    <div className="flex justify-between text-[#5E6660] text-[11px]"><span>Confidence</span><span className="font-mono font-bold text-[#3A5A40]">{selected.confidence}%</span></div>
                    <div className="flex justify-between text-[#5E6660] text-[11px]"><span>IoU agreement</span><span className="font-mono font-bold text-[#3A5A40]">{selected.agreementScore == null ? 'n/a' : `${selected.agreementScore}%`}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#F1F3F0] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#5E6660] font-semibold">Your decision is saved to the database.</span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => act('accept')} disabled={isSubmitting} className="px-4 py-2 bg-[#3A5A40] hover:bg-[#2D4632] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>Accept</span>
                </button>
                {sourceOptions.length > 1 && (
                  <div className="flex items-center gap-1">
                    <select value={chosenSource} onChange={(e) => setChosenSource(e.target.value)} className="px-2 py-2 rounded-xl text-xs border border-[#E8E6E1] bg-white">
                      <option value="">Prefer a source…</option>
                      {sourceOptions.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
                    </select>
                    <button onClick={() => act('source')} disabled={isSubmitting || !chosenSource} className="px-3 py-2 bg-[#F1F3F0] hover:bg-[#E8E6E1] rounded-xl text-xs font-bold transition disabled:opacity-40">Record</button>
                  </div>
                )}
                <button onClick={() => act('reject')} disabled={isSubmitting} className="px-3.5 py-2 bg-white hover:bg-[#FDF2F0] border border-[#F8D7DA] text-[#D66D54] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50">
                  <ThumbsDown className="w-3.5 h-3.5" /><span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
