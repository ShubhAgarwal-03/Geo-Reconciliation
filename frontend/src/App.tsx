import React, { useState } from 'react';
import { 
  BuildingEntity, 
  ActiveTab, 
  Language, 
  UploadedFile, 
  ReconciliationStats 
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

export default function App() {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<Language>('en');

  // Core Data State — pulls from the Geo-Reconciliation API when reachable,
  // silently falls back to mock data otherwise (see useLiveBuildings).
  const { buildings, source: dataSource } = useLiveBuildings();
  const [stats, setStats] = useState<ReconciliationStats>(initialStats);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);

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

  const handleReconciliationComplete = () => {
    // Update stats to reflect the completed reconciliation
    setStats(prev => ({
      ...prev,
      matched: 1103,
      requiresReview: 11,
      averageConfidence: 94,
      conflictsDetected: 11,
      autoResolved: 31,
    }));

    // If current selected building was in conflict or review, verify it
    if (selectedBuilding) {
      setSelectedBuilding(prev => prev ? {
        ...prev,
        status: 'reconciled',
        confidence: Math.max(prev.confidence, 94),
        agreementScore: 96,
      } : null);
    }
  };

  const handleAddFile = (newFile: UploadedFile) => {
    setUploadedFiles(prev => [newFile, ...prev]);
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
        reviewCount={stats.requiresReview}
      />

      {/* 3. Main Dynamic Content Views */}
      <main className="flex-1 w-full relative">
        
        {/* VIEW A: Before vs After Comparison (when direct toggle or via compare button) */}
        {showBeforeAfterDirect ? (
          <BeforeAfterView
            buildings={buildings}
            stats={stats}
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
                stats={stats}
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
                language={language}
              />
            )}

            {/* VIEW 5: Reports Analytics View */}
            {activeTab === 'reports' && (
              <ReportsView
                buildings={buildings}
                stats={stats}
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
