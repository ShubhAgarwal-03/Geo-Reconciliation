import React, { useCallback, useEffect, useState } from 'react';
import {
  BuildingEntity, ActiveTab, Language, UploadedFile, DatasetStats, ActivityEntry, BuildingStatus,
} from './types';
import { useLiveBuildings, loadReviewQueue, Viewport } from './hooks/useLiveBuildings';
import { adaptStats, applyDetail } from './api/adapter';
import {
  checkHealth, fetchStats, fetchEntityDetail, fetchEntityMembers, resolveEntity,
} from './api/geoReconciliationClient';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { InteractiveMap } from './components/InteractiveMap';
import { BuildingDetailPanel } from './components/BuildingDetailPanel';
import { DataUploadView } from './components/DataUploadView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { BeforeAfterView } from './components/BeforeAfterView';
import { ReportsView } from './components/ReportsView';
import { SourceComparisonModal } from './components/SourceComparisonModal';
import { ReconciliationModal } from './components/ReconciliationModal';
import { DigitalLandEntityModal } from './components/DigitalLandEntityModal';
import { TechnicalDetailsModal } from './components/TechnicalDetailsModal';
import { HistoryModal } from './components/HistoryModal';
import { DemoTourModal } from './components/DemoTourModal';
import { shortId } from './data/sources';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [showBeforeAfterDirect, setShowBeforeAfterDirect] = useState(false);

  // ---- API health (handles Render cold starts: keep retrying until it answers)
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  useEffect(() => {
    if (apiStatus === 'ok') return;
    let cancelled = false;
    let timer: number | undefined;
    const ping = async () => {
      try {
        const h = await checkHealth();
        if (cancelled) return;
        if (h.status === 'ok') { setApiStatus('ok'); return; }
        setApiStatus('down');
      } catch {
        if (!cancelled) setApiStatus('down');
      }
      timer = window.setTimeout(ping, 5000);
    };
    ping();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [apiStatus]);

  // ---- Map-driven entity loading (no mock / OSM fallback)
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const {
    buildings, setBuildings, loading, error: buildingsError, truncated, tooZoomedOut, refetch,
  } = useLiveBuildings(viewport);

  // ---- Dataset-wide stats come from the database, not from the loaded page
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const loadStats = useCallback(async () => {
    try { setStats(adaptStats(await fetchStats())); setStatsError(null); }
    catch (e) { setStatsError(errMsg(e)); }
  }, []);
  useEffect(() => { loadStats(); }, [loadStats, apiStatus]);

  // ---- Review queue is its own endpoint
  const [reviewItems, setReviewItems] = useState<BuildingEntity[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const loadReview = useCallback(async () => {
    setReviewLoading(true);
    try { setReviewItems(await loadReviewQueue()); setReviewError(null); }
    catch (e) { setReviewError(errMsg(e)); }
    finally { setReviewLoading(false); }
  }, []);
  useEffect(() => { if (activeTab === 'review') loadReview(); }, [activeTab, loadReview]);

  // ---- Selection + lazily loaded detail (members, timestamps, scores)
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntity | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  useEffect(() => {
    const sel = selectedBuilding;
    if (!sel || sel.detailLoaded) return;
    let cancelled = false;
    setDetailError(null);
    Promise.all([fetchEntityDetail(sel.id), fetchEntityMembers(sel.id).catch(() => null)])
      .then(([detail, members]) => {
        if (cancelled) return;
        if (!members) setDetailError('the /members endpoint is not available');
        setSelectedBuilding((prev) => (prev && prev.id === sel.id ? applyDetail(prev, detail, members) : prev));
      })
      .catch((e) => {
        if (cancelled) return;
        setDetailError(errMsg(e));
        setSelectedBuilding((prev) => (prev && prev.id === sel.id ? { ...prev, detailLoaded: true } : prev));
      });
    return () => { cancelled = true; };
  }, [selectedBuilding?.id, selectedBuilding?.detailLoaded]);

  // ---- Session activity log (real events only)
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const logActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) =>
    setActivityLog((prev) => [
      { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now(), ...entry },
      ...prev,
    ].slice(0, 20));

  // ---- Modals
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showTechDetailsModal, setShowTechDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);

  // ---- Uploads / reconciliation (optional feature; heavy job runs on the backend)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [reconcileFile, setReconcileFile] = useState<UploadedFile | null>(null);

  const handleAddFile = (f: UploadedFile) => {
    setUploadedFiles((prev) => [f, ...prev]);
    logActivity({ type: 'info', title: `Uploaded ${f.name}` });
  };

  const handleReconciliationComplete = (r?: { canonical_entity_count?: number | null; review_queue_count?: number | null }) => {
    if (r) logActivity({ type: 'verified', title: `Pipeline run complete — ${r.canonical_entity_count ?? '?'} entities, ${r.review_queue_count ?? 0} flagged for review` });
    loadStats(); refetch();
    setActiveTab('map');
  };

  // ---- Review decisions (persisted by the API)
  const [isResolving, setIsResolving] = useState(false);
  const updateBuildingStatus = (id: string, status: BuildingStatus) => {
    setBuildings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setSelectedBuilding((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    if (status !== 'review') setReviewItems((prev) => prev.filter((b) => b.id !== id));
    loadStats();
  };

  const decide = async (id: string, kind: 'approved' | 'rejected') => {
    setIsResolving(true);
    try {
      await resolveEntity(id, { status: kind });
      updateBuildingStatus(id, kind === 'approved' ? 'reconciled' : 'conflict');
      logActivity({ type: kind === 'approved' ? 'success' : 'warning', title: `Entity #${shortId(id)} ${kind}` });
    } catch (e) {
      logActivity({ type: 'warning', title: `Failed to save decision for #${shortId(id)} — ${errMsg(e)}` });
    } finally {
      setIsResolving(false);
    }
  };

  const goToEntityOnMap = (b: BuildingEntity) => { setSelectedBuilding(b); setActiveTab('map'); };

  const mapProps = {
    buildings, selectedBuilding, onSelectBuilding: setSelectedBuilding, language,
    onViewportChange: setViewport, loading, error: buildingsError, truncated, tooZoomedOut, onRetry: refetch,
  };
  const exampleBuilding = buildings.find((b) => b.sourcesCount > 1) ?? buildings[0] ?? null;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D312E] flex flex-col font-sans selection:bg-[#3A5A40] selection:text-white antialiased">
      <Navbar
        language={language}
        apiStatus={apiStatus}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
        onStartDemoTour={() => setShowDemoTour(true)}
      />

      {apiStatus !== 'ok' && (
        <div className="bg-[#FFF9F0] border-b border-[#FDEACD] text-[#B07D3E] text-xs font-semibold text-center py-2 px-4">
          {apiStatus === 'checking'
            ? 'Connecting to the reconciliation API…'
            : 'The API is waking up (free hosting can take up to a minute). Retrying automatically…'}
        </div>
      )}

      <NavigationTabs
        activeTab={showBeforeAfterDirect ? 'dashboard' : activeTab}
        onTabChange={(tab) => { setShowBeforeAfterDirect(false); setActiveTab(tab); }}
        language={language}
        reviewCount={stats?.needsReview ?? 0}
      />

      <main className="flex-1 w-full relative">
        {showBeforeAfterDirect ? (
          <BeforeAfterView buildings={buildings} stats={stats} language={language}
            onGoToMap={() => { setShowBeforeAfterDirect(false); setActiveTab('map'); }} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats} statsError={statsError} activityLog={activityLog}
                mapProps={mapProps} selectedBuilding={selectedBuilding}
                language={language}
                onOpenUpload={() => setActiveTab('data')}
                onGoToBeforeAfter={() => setShowBeforeAfterDirect(true)}
                onGoToFullMap={() => setActiveTab('map')}
                onGoToReview={() => setActiveTab('review')}
              />
            )}

            {activeTab === 'map' && (
              <div className="flex flex-col lg:flex-row h-[calc(100vh-122px)] w-full overflow-hidden">
                <div className="flex-1 h-full relative"><InteractiveMap {...mapProps} /></div>
                <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#E8E6E1] bg-white h-auto lg:h-full overflow-hidden shrink-0 shadow-sm z-20">
                  <BuildingDetailPanel
                    building={selectedBuilding} detailError={detailError} language={language}
                    onClose={() => setSelectedBuilding(null)}
                    onViewSources={() => setShowSourcesModal(true)}
                    onOpenDigitalCard={() => setShowDigitalCardModal(true)}
                    onOpenTechnicalDetails={() => setShowTechDetailsModal(true)}
                    onOpenHistory={() => setShowHistoryModal(true)}
                    onApprove={(id) => decide(id, 'approved')}
                    onReject={(id) => decide(id, 'rejected')}
                    isResolving={isResolving}
                  />
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <DataUploadView
                uploadedFiles={uploadedFiles} stats={stats} onAddFile={handleAddFile}
                language={language} onRunReconcile={(f) => setReconcileFile(f)}
              />
            )}

            {activeTab === 'review' && (
              <ReviewQueueView
                buildings={reviewItems} loading={reviewLoading} error={reviewError} onRetry={loadReview}
                onSelectBuildingOnMap={goToEntityOnMap}
                onResolved={(id, status) => {
                  updateBuildingStatus(id, status);
                  logActivity({ type: 'success', title: `Entity #${shortId(id)} resolved from the review queue` });
                }}
                language={language}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView stats={stats} statsError={statsError} buildings={buildings} language={language} />
            )}
          </>
        )}
      </main>

      {showSourcesModal && selectedBuilding && (
        <SourceComparisonModal building={selectedBuilding} onClose={() => setShowSourcesModal(false)} language={language} />
      )}
      {reconcileFile && (
        <ReconciliationModal file={reconcileFile} language={language}
          onClose={() => setReconcileFile(null)} onComplete={handleReconciliationComplete} />
      )}
      {showDigitalCardModal && selectedBuilding && (
        <DigitalLandEntityModal building={selectedBuilding} language={language}
          onClose={() => setShowDigitalCardModal(false)}
          onViewSources={() => setShowSourcesModal(true)} />
      )}
      {showTechDetailsModal && selectedBuilding && (
        <TechnicalDetailsModal building={selectedBuilding} onClose={() => setShowTechDetailsModal(false)} language={language} />
      )}
      {showHistoryModal && selectedBuilding && (
        <HistoryModal building={selectedBuilding} onClose={() => setShowHistoryModal(false)} language={language} />
      )}
      {showDemoTour && (
        <DemoTourModal
          onClose={() => setShowDemoTour(false)} language={language} stats={stats}
          example={exampleBuilding}
          onNavigateTab={(tab) => { setShowBeforeAfterDirect(false); setActiveTab(tab); }}
          onSelectBuilding={setSelectedBuilding}
          onOpenSourcesModal={() => setShowSourcesModal(true)}
        />
      )}
    </div>
  );
}
