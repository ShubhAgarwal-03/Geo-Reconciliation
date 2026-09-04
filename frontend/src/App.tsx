import React, { useState } from 'react';
import { 
  BuildingEntity, 
  ActiveTab, 
  Language, 
  UploadedFile, 
  ReconciliationStats,
  ActivityEntry,
} from './types';
import { 
  generateGridBuildings, 
  initialStats, 
  initialUploadedFiles 
} from './data/mockBuildings';
import { useLiveBuildings } from './hooks/useLiveBuildings';
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
import { resolveEntity } from './api/geoReconciliationClient';

export default function App() {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<Language>('en');

  // Core Data State — pulls from the Geo-Reconciliation API when reachable,
  // silently falls back to mock data otherwise (see useLiveBuildings).
  const { buildings: liveBuildings, source: dataSource, refetch: refetchBuildings } = useLiveBuildings();
  const [buildings, setBuildings] = useState<BuildingEntity[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Mirror the hook's data into local state so approve/reject can optimistically
  // update one entity without waiting for a full re-fetch.
  React.useEffect(() => {
    setBuildings(liveBuildings);
  }, [liveBuildings]);

    // `stats` still seeds a handful of fields with no real backend source at
    // all (conflictsDetected, autoResolved, before/after confidence & conflict
    // counts — pipeline_runs doesn't store these, see reconcile.py). Those
    // stay demo-baseline values and are clearly labeled as such in the UI.
    const [stats, setStats] = useState<ReconciliationStats>(initialStats);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);

  // The four dashboard headline numbers, real-derived from the actual
  // buildings array on every render — never trusted from mock `stats`.
  // Only conflictsDetected/autoResolved/before-after fields (no backend
  // source yet) fall through from `stats`.
  const derivedStats = React.useMemo<ReconciliationStats>(() => {
    const totalBuildings = buildings.length;
    const matched = buildings.filter(b => b.status === 'reconciled').length;
    const requiresReview = buildings.filter(b => b.status === 'review' || b.status === 'conflict').length;
    const averageConfidence = totalBuildings > 0
      ? Math.round(buildings.reduce((sum, b) => sum + b.confidence, 0) / totalBuildings)
      : 0;
    return { ...stats, totalBuildings, matched, requiresReview, averageConfidence };
  }, [buildings, stats]);

    // Real session activity log — populated by actions below (approve,
    // reject, upload, reconcile), not a static fake feed.
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const logActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
      setActivityLog(prev => [
        { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now(), ...entry },
        ...prev,
      ].slice(0, 20));
    };

  // Selection & Modal States
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntity | null>(() => {
    // Default to showcase building BLD-1028
    const grid = generateGridBuildings();
    return grid.find(b => b.id === 'BLD-1028') || grid[0];
  });

  // Once real data (or the mock fallback) has loaded, make sure a building
  // is selected — the buildings array is empty for an instant on first render
  // while useLiveBuildings is fetching.
  React.useEffect(() => {
    if (buildings.length === 0) return;
    setSelectedBuilding((prev) => {
      if (prev && buildings.some((b) => b.id === prev.id)) return prev;
      return buildings.find((b) => b.id === 'BLD-1028') || buildings[0];
    });
  }, [buildings]);

  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showTechDetailsModal, setShowTechDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [showBeforeAfterDirect, setShowBeforeAfterDirect] = useState(false);

  // Handlers
  const handleSelectBuilding = (building: BuildingEntity) => {
    setSelectedBuilding(building);
  };

  const handleSelectBuildingOnMap = (building: BuildingEntity) => {
    setSelectedBuilding(building);
    setActiveTab('map');
  };

  const updateBuildingStatus = (id: string, status: BuildingEntity['status']) => {
  setBuildings(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
  setSelectedBuilding(prev => (prev && prev.id === id ? { ...prev, status } : prev));
};

const handleApprove = async (id: string) => {
  setIsResolving(true);
  try {
    await resolveEntity(id, { status: 'approved' });
    updateBuildingStatus(id, 'reconciled');
    logActivity({ type: 'success', title: `Building #${id} approved and reconciled` });
  } catch (e) {
    console.error('Failed to approve entity', id, e);
    logActivity({ type: 'warning', title: `Failed to approve #${id} — ${e instanceof Error ? e.message : 'request failed'}` });
  } finally {
    setIsResolving(false);
  }
};

const handleReject = async (id: string) => {
  setIsResolving(true);
  try {
    await resolveEntity(id, { status: 'rejected' });
    updateBuildingStatus(id, 'conflict');
    logActivity({ type: 'warning', title: `Building #${id} rejected — flagged as conflict` });
  } catch (e) {
    console.error('Failed to reject entity', id, e);
    logActivity({ type: 'warning', title: `Failed to reject #${id} — ${e instanceof Error ? e.message : 'request failed'}` });
  } finally {
    setIsResolving(false);
  }
};

  const handleReconciliationComplete = (result?: {
  raw_feature_count?: number | null;
  canonical_entity_count?: number | null;
  review_queue_count?: number | null;
}) => {
  // NOTE: totalBuildings/requiresReview are NOT set here anymore — they're
  // always derived live from the real `buildings` array in `derivedStats`
  // below, so setting them from the reconcile response would just be a
  // second, possibly-stale source of truth for the same numbers.
  if (result) {
    logActivity({
      type: 'verified',
      title: `Reconciliation run complete — ${result.canonical_entity_count ?? '?'} entities, ${result.review_queue_count ?? 0} flagged for review`,
    });
  }
  // Pull the freshly reconciled entities into the map/dashboard.
  refetchBuildings();
};

  const handleAddFile = (newFile: UploadedFile) => {
    setUploadedFiles(prev => [newFile, ...prev]);
    logActivity({ type: 'info', title: `Uploaded ${newFile.name} (${newFile.status})` });
  };

  // Target showcase building for the demo tour
  const showcaseBuilding = buildings.find(b => b.id === 'BLD-1028') || buildings[0];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D312E] flex flex-col font-sans selection:bg-[#3A5A40] selection:text-white antialiased">
      
      {/* 1. Universal Top Navbar */}
      <Navbar
        language={language}
        onToggleLanguage={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
        onStartDemoTour={() => setShowDemoTour(true)}
      />

      {/* 2. Primary Navigation Tabs (Dashboard, Map, Data, Review, Reports) */}
      <NavigationTabs
        activeTab={showBeforeAfterDirect ? 'dashboard' : activeTab}
        onTabChange={(tab) => {
          setShowBeforeAfterDirect(false);
          setActiveTab(tab);
        }}
        language={language}
        reviewCount={derivedStats.requiresReview}
      />

      {/* 3. Main Dynamic Content Views */}
      <main className="flex-1 w-full relative">
        
        {/* VIEW A: Before vs After Comparison (when direct toggle or via compare button) */}
        {showBeforeAfterDirect ? (
          <BeforeAfterView
            buildings={buildings}
            stats={derivedStats}
            language={language}
            onGoToMap={() => {
              setShowBeforeAfterDirect(false);
              setActiveTab('map');
            }}
          />
        ) : (
          <>
            {/* VIEW 1: Dashboard View */}
            {activeTab === 'dashboard' && (
              <DashboardView
                buildings={buildings}
                stats={derivedStats}
                dataSource={dataSource}
                activityLog={activityLog}
                showcaseBuilding={showcaseBuilding}
                selectedBuilding={selectedBuilding}
                onSelectBuilding={handleSelectBuilding}
                language={language}
                onOpenUpload={() => setActiveTab('data')}
                onOpenReconciliation={() => setShowReconcileModal(true)}
                onGoToBeforeAfter={() => setShowBeforeAfterDirect(true)}
                onGoToFullMap={() => setActiveTab('map')}
                onGoToReview={() => setActiveTab('review')}
              />
            )}

            {/* VIEW 2: Interactive Map View */}
            {activeTab === 'map' && (
              <div className="flex flex-col lg:flex-row h-[calc(100vh-122px)] w-full overflow-hidden">
                {/* Left/Center: The Interactive Map */}
                <div className="flex-1 h-full relative">
                  <InteractiveMap
                    buildings={buildings}
                    selectedBuilding={selectedBuilding}
                    onSelectBuilding={handleSelectBuilding}
                    language={language}
                    onOpenReconcileModal={() => setShowReconcileModal(true)}
                    onOpenUploadModal={() => setActiveTab('data')}
                  />
                </div>

                {/* Right: Building Detail & Source Agreement Panel */}
                <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#E8E6E1] bg-white h-auto lg:h-full overflow-hidden shrink-0 shadow-sm z-20">
                  <BuildingDetailPanel
  building={selectedBuilding}
  onClose={() => setSelectedBuilding(null)}
  language={language}
  onViewSources={() => setShowSourcesModal(true)}
  onOpenReconcile={() => setShowReconcileModal(true)}
  onOpenDigitalCard={() => setShowDigitalCardModal(true)}
  onOpenTechnicalDetails={() => setShowTechDetailsModal(true)}
  onOpenHistory={() => setShowHistoryModal(true)}
  onApprove={handleApprove}
  onReject={handleReject}
  isResolving={isResolving}
/>
                </div>
              </div>
            )}

            {/* VIEW 3: Data Upload View */}
            {activeTab === 'data' && (
              <DataUploadView
                uploadedFiles={uploadedFiles}
                onAddFile={handleAddFile}
                language={language}
                onGoToReconcile={() => setShowReconcileModal(true)}
              />
            )}

            {/* VIEW 4: Review Queue View */}
            {activeTab === 'review' && (
              <ReviewQueueView
                buildings={buildings}
                onSelectBuildingOnMap={handleSelectBuildingOnMap}
                onResolved={(id, status) => {
                  updateBuildingStatus(id, status);
                  logActivity({ type: 'success', title: `Building #${id} resolved from review queue` });
                }}
                language={language}
              />
            )}

            {/* VIEW 5: Reports Analytics View */}
            {activeTab === 'reports' && (
              <ReportsView
                buildings={buildings}
                stats={derivedStats}
                language={language}
              />
            )}
          </>
        )}

      </main>

      {/* 4. MODALS & SLIDE-OVERS */}

      {/* Modal 1: Source Comparison Modal (Before vs After individual building footprints) */}
      {showSourcesModal && selectedBuilding && (
        <SourceComparisonModal
          building={selectedBuilding}
          onClose={() => setShowSourcesModal(false)}
          language={language}
        />
      )}

      {/* Modal 2: 7-Stage Reconciliation Pipeline Visualizer Modal */}
      {showReconcileModal && (
  <ReconciliationModal
    onClose={() => setShowReconcileModal(false)}
    language={language}
    onComplete={handleReconciliationComplete}
  />
)}

      {/* Modal 3: Official Digital Land Entity Certificate Card Modal */}
      {showDigitalCardModal && selectedBuilding && (
        <DigitalLandEntityModal
          building={selectedBuilding}
          onClose={() => setShowDigitalCardModal(false)}
          language={language}
          onViewSources={() => setShowSourcesModal(true)}
        />
      )}

      {/* Modal 4: Advanced GIS Technical Details & Engineering Metrics Modal */}
      {showTechDetailsModal && selectedBuilding && (
        <TechnicalDetailsModal
          building={selectedBuilding}
          onClose={() => setShowTechDetailsModal(false)}
          language={language}
        />
      )}

      {/* Modal 5: Audit History Trail Modal */}
      {showHistoryModal && selectedBuilding && (
        <HistoryModal
          building={selectedBuilding}
          onClose={() => setShowHistoryModal(false)}
          language={language}
        />
      )}

      {/* Modal 6: 14-Step Guided Hackathon Demo Tour */}
      {showDemoTour && (
        <DemoTourModal
          onClose={() => setShowDemoTour(false)}
          onNavigateTab={(tab) => {
            setShowBeforeAfterDirect(false);
            setActiveTab(tab);
          }}
          onSelectBuilding={handleSelectBuilding}
          showcaseBuilding={showcaseBuilding}
          onOpenSourcesModal={() => setShowSourcesModal(true)}
          onOpenReconciliationModal={() => setShowReconcileModal(true)}
          onOpenDigitalCard={() => setShowDigitalCardModal(true)}
          language={language}
        />
      )}

    </div>
  );
}