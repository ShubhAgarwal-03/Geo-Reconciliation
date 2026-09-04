import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Loader2, Cpu, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/i18n';
import { triggerReconcile, getReconcileStatus, ReconcileResponse } from '../api/geoReconciliationClient';


interface ReconciliationModalProps {
  onClose: () => void;
  language: Language;
  onComplete: (result?: { raw_feature_count?: number | null; canonical_entity_count?: number | null; review_queue_count?: number | null }) => void;
  uploadedFilePath?: string;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  onClose,
  language,
  onComplete,
  uploadedFilePath,
}) => {
  const t = translations[language];
  const [status, setStatus] = useState<'starting' | 'running' | 'complete' | 'error'>('starting');
  const [result, setResult] = useState<ReconcileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const started = await triggerReconcile(uploadedFilePath);
        if (cancelled) return;
        setStatus('running');

        pollRef.current = window.setInterval(async () => {
          try {
            const s = await getReconcileStatus(started.run_id);
            if (cancelled) return;
            if (s.status === 'complete') {
              setResult(s);
              setStatus('complete');
              if (pollRef.current) window.clearInterval(pollRef.current);
            }
          } catch (e) {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
            if (pollRef.current) window.clearInterval(pollRef.current);
          }
        }, 3000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }

    start();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [uploadedFilePath]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">

        <div className="p-5 border-b border-[#F1F3F0] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3A5A40] flex items-center justify-center text-white shadow-sm">
              <Cpu className={`w-5 h-5 ${status === 'running' || status === 'starting' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C44]">
                NAKSHA Automated Reconciliation Engine
              </span>
              <h3 className="text-xl font-serif font-bold text-[#1B2B1F]">Reconciling Land Data</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#5E6660] hover:text-[#1B2B1F] hover:bg-[#F1F3F0] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {status === 'error' && (
            <div className="p-3.5 rounded-2xl border border-[#F8D7DA] bg-[#FDF2F0] text-[#902A1A] text-xs">
              Reconciliation failed to start or check status: {error}
            </div>
          )}

          {(status === 'starting' || status === 'running') && (
            <div className="bg-[#1B2B1F] text-white rounded-2xl p-6 shadow-sm border border-[#2D4632] flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A05B]" />
              <span className="text-sm font-bold">
                {status === 'starting' ? 'Starting pipeline run…' : 'Pipeline running — this can take a while on a full district'}
              </span>
              <span className="text-[11px] text-[#BDC9BF]">
                This runs the real matching pipeline (OSM + Google Open Buildings{uploadedFilePath ? ' + your uploaded file' : ''}). No fixed ETA — status updates every few seconds.
              </span>
            </div>
          )}

          {status === 'complete' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#3A5A40] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Reconciliation complete
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="bg-[#FAF9F6] border border-[#E8E6E1] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#A3A9A5] block">Raw Features</span>
                  <span className="text-base font-serif font-bold text-[#1B2B1F]">{result.raw_feature_count ?? '—'}</span>
                </div>
                <div className="bg-[#EAF2EA] border border-[#BDC9BF]/60 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#4A7C44] block">Canonical Entities</span>
                  <span className="text-base font-serif font-bold text-[#3A5A40]">{result.canonical_entity_count ?? '—'}</span>
                </div>
                <div className="bg-[#FDF2F0] border border-[#F8D7DA] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#D66D54] block">Needs Review</span>
                  <span className="text-base font-serif font-bold text-[#D66D54]">{result.review_queue_count ?? '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#F1F3F0] flex items-center justify-end bg-[#FAF9F6]">
          <button
            onClick={() => { onComplete(result ?? undefined); onClose(); }}
            disabled={status !== 'complete'}
            className="px-5 py-2 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
          >
            <span>Apply Results & View Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};