import React, { useState, useEffect } from 'react';
import { 
  CanonicalEntity, 
  ActiveTab, 
  Language, 
  UploadedFile 
} from './types';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { InteractiveMap } from './components/InteractiveMap';
import { BuildingDetailPanel } from './components/BuildingDetailPanel';
import { DataUploadView } from './components/DataUploadView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { ReportsView } from './components/ReportsView';
import { SourceComparisonModal } from './components/SourceComparisonModal';
import { ReconciliationModal } from './components/ReconciliationModal';
import { api } from './services/api';

const initialUploadedFiles: UploadedFile[] = [
  {
    id: "UPL-9081",
    name: "OpenStreetMap_Bengaluru_Buildings.geojson",
    dataType: "Building Footprints",
    size: "14.8 MB",
    uploadDate: "Ingested",
    status: "processed",
    crsDetected: "EPSG:4326 -> EPSG:32643 (UTM 43N)",
    featuresCount: 12480,
    errorCount: 0,
  },
  {
    id: "UPL-9082",
    name: "Google_Open_Buildings_V3_SouthBLR.csv",
    dataType: "Building Footprints",
    size: "28.3 MB",
    uploadDate: "Ingested",
    status: "processed",
    crsDetected: "EPSG:4326 -> EPSG:32643 (UTM 43N)",
    featuresCount: 18920,
    errorCount: 0,
  },
];

export default function App() {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguage] = useState<Language>('en');

  // Core Data State
  const [selectedBuilding, setSelectedBuilding] = useState<CanonicalEntity | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Modals
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Fetch initial review count and health
  useEffect(() => {
    api.getHealth().then((h) => {
      setIsOnline(h.status === 'ok');
    });

    api.getReviewQueue().then((q) => {
      setReviewCount(q.length);
    }).catch(() => {});
  }, []);

  // Handlers
  const handleSelectBuilding = (building: CanonicalEntity | null) => {
    setSelectedBuilding(building);
  };

  const handleSelectBuildingOnMap = (building: CanonicalEntity) => {
    setSelectedBuilding(building);
    setActiveTab('map');
  };

  const handleBuildingUpdated = (updated: CanonicalEntity) => {
    setSelectedBuilding(updated);
    if (!updated.needs_review) {
      setReviewCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleAddFile = (newFile: UploadedFile) => {
    setUploadedFiles((prev) => [newFile, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D312E] flex flex-col font-sans selection:bg-[#3A5A40] selection:text-white antialiased">
      
      {/* 1. Top Navbar */}
      <Navbar
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline((prev) => !prev)}
        onStartReconciliation={() => setShowReconcileModal(true)}
        onStartDemoTour={() => setActiveTab('map')}
      />

      {/* 2. Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        language={language}
        reviewCount={reviewCount}
      />

      {/* 3. Main Views */}
      <main className="flex-1 w-full relative">
        
        {/* VIEW 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            language={language}
            onGoToFullMap={() => setActiveTab('map')}
            onGoToReview={() => setActiveTab('review')}
            onOpenReconciliation={() => setShowReconcileModal(true)}
            onOpenUpload={() => setActiveTab('data')}
          />
        )}

        {/* VIEW 2: Interactive Map View */}
        {activeTab === 'map' && (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-122px)] w-full overflow-hidden">
            {/* Map Area */}
            <div className="flex-1 h-full relative">
              <InteractiveMap
                selectedBuilding={selectedBuilding}
                onSelectBuilding={handleSelectBuilding}
                language={language}
                onOpenReconcileModal={() => setShowReconcileModal(true)}
                onOpenUploadModal={() => setActiveTab('data')}
              />
            </div>

            {/* Sidebar Detail Panel */}
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#E8E6E1] bg-white h-auto lg:h-full overflow-hidden shrink-0 shadow-sm z-20">
              <BuildingDetailPanel
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
                language={language}
                onViewSources={() => setShowSourcesModal(true)}
                onBuildingUpdated={handleBuildingUpdated}
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
            onSelectBuildingOnMap={handleSelectBuildingOnMap}
            language={language}
          />
        )}

        {/* VIEW 5: Reports / Metrics View */}
        {activeTab === 'reports' && (
          <DashboardView
            language={language}
            onGoToFullMap={() => setActiveTab('map')}
            onGoToReview={() => setActiveTab('review')}
            onOpenReconciliation={() => setShowReconcileModal(true)}
            onOpenUpload={() => setActiveTab('data')}
          />
        )}

      </main>

      {/* 4. Modals */}
      {showSourcesModal && selectedBuilding && (
        <SourceComparisonModal
          building={selectedBuilding}
          onClose={() => setShowSourcesModal(false)}
          language={language}
        />
      )}

      {showReconcileModal && (
        <ReconciliationModal
          onClose={() => setShowReconcileModal(false)}
          language={language}
          onComplete={() => {
            setShowReconcileModal(false);
            api.getReviewQueue().then((q) => setReviewCount(q.length));
          }}
        />
      )}

    </div>
  );
}
