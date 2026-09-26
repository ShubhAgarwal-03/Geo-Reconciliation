import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  MapPin, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  Play
} from 'lucide-react';
import { ActiveTab, BuildingEntity, Language } from '../types';

interface DemoTourModalProps {
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectBuilding: (building: BuildingEntity) => void;
  showcaseBuilding: BuildingEntity;
  onOpenSourcesModal: () => void;
  onOpenReconciliationModal: () => void;
  onOpenDigitalCard: () => void;
  language: Language;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  onClose,
  onNavigateTab,
  onSelectBuilding,
  showcaseBuilding,
  onOpenSourcesModal,
  onOpenReconciliationModal,
  onOpenDigitalCard,
  language,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps = [
    {
      stepNumber: 1,
      title: "1. Open Urban Land Data Console",
      description: "LandLens welcomes government surveyors to a high-contrast, clean console showing real-time multi-source data status under the NAKSHA ecosystem.",
      actionText: "Show Dashboard Stats",
      onAction: () => onNavigateTab('dashboard'),
    },
    {
      stepNumber: 2,
      title: "2. Multi-Source Statistics Overview",
      description: "1,248 total parcels ingested from 4 sources (Drone ORI, Cadastral, Municipal, GNSS). 1,103 matched automatically with 94% average confidence.",
      actionText: "Inspect Pilot Metrics",
      onAction: () => onNavigateTab('dashboard'),
    },
    {
      stepNumber: 3,
      title: "3. Open Main Interactive Map",
      description: "Realistic GIS map with street & satellite tiles, layer controls (Imagery, Cadastral, Roads, GNSS, Municipal, Reconciled), and confidence color-coding.",
      actionText: "Switch to Interactive Map",
      onAction: () => onNavigateTab('map'),
    },
    {
      stepNumber: 4,
      title: "4. Select Building #BLD-1028",
      description: "Clicking a building opens the instant side-inspection panel displaying area, land use, height, and source agreement checklist.",
      actionText: "Inspect Building #1028",
      onAction: () => {
        onNavigateTab('map');
        onSelectBuilding(showcaseBuilding);
      },
    },
    {
      stepNumber: 5,
      title: "5. Compare Multiple Source Measurements",
      description: "Notice the raw discrepancy across datasets: ORI (498 m²), Municipal GIS (512 m²), Cadastral (505 m²), AI Extraction (501 m²).",
      actionText: "View Source Comparison",
      onAction: () => {
        onNavigateTab('map');
        onSelectBuilding(showcaseBuilding);
        onOpenSourcesModal();
      },
    },
    {
      stepNumber: 6,
      title: "6. Visual Footprint Overlay",
      description: "See the 4 independent boundaries overlaid simultaneously in distinct colors (Cadastral purple, Municipal blue, Drone amber, AI teal).",
      actionText: "Examine Overlaid Differences",
      onAction: () => {
        onOpenSourcesModal();
      },
    },
    {
      stepNumber: 7,
      title: "7. Run Automated Reconciliation",
      description: "Trigger the NAKSHA automated engine to resolve coordinate shifts, eave overhangs, and boundary conflicts.",
      actionText: "Launch Reconciliation Pipeline",
      onAction: () => {
        onOpenReconciliationModal();
      },
    },
    {
      stepNumber: 8,
      title: "8. 7-Stage Processing Pipeline",
      description: "Watch live progress: CRS aligned to EPSG:4326 → SAM-2 features extracted → spatial matching → conflict resolution → confidence scoring.",
      actionText: "Track Pipeline Stages",
      onAction: () => {
        onOpenReconciliationModal();
      },
    },
    {
      stepNumber: 9,
      title: "9. Produce Unified Reconciled Geometry",
      description: "The 4 disparate source footprints morph into one unified, legally validated land parcel.",
      actionText: "See Morph Transition",
      onAction: () => {
        onOpenSourcesModal();
      },
    },
    {
      stepNumber: 10,
      title: "10. Display Final Reconciled Area",
      description: "Final consensus measurement: 505 m² (aligned strictly with Revenue Cadastral markers and 5cm Drone ground truth).",
      actionText: "Verify Final Measurements",
      onAction: () => {
        onNavigateTab('map');
        onSelectBuilding(showcaseBuilding);
      },
    },
    {
      stepNumber: 11,
      title: "11. Calculate Confidence Reliability Score",
      description: "Clear confidence score: 94% (Highly Reliable / Verified) with full geometry, source, and attribute agreements verified.",
      actionText: "View Confidence Checklist",
      onAction: () => {
        onNavigateTab('map');
        onSelectBuilding(showcaseBuilding);
      },
    },
    {
      stepNumber: 12,
      title: "12. Human-in-the-Loop Review Queue",
      description: "Low-confidence edge cases (e.g. Building #1044, #1015) route automatically to the split-screen operator review queue.",
      actionText: "Open Review Queue",
      onAction: () => onNavigateTab('review'),
    },
    {
      stepNumber: 13,
      title: "13. Compare Data (Before vs After)",
      description: "Wipe between before (42 conflicts, 82% confidence) and after (11 conflicts, 94% confidence) to see the transformative impact.",
      actionText: "Open Before vs After Slider",
      onAction: () => onNavigateTab('dashboard'),
    },
    {
      stepNumber: 14,
      title: "14. Export Digital Land Entity Card",
      description: "Generate official government certificate with QR verification stamp, survey number, security hash, and standardized GeoJSON download.",
      actionText: "View Digital Land Card",
      onAction: () => {
        onNavigateTab('map');
        onSelectBuilding(showcaseBuilding);
        onOpenDigitalCard();
      },
    },
  ];

  const current = demoSteps[currentStep];

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      demoSteps[nextIdx].onAction();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      demoSteps[prevIdx].onAction();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[460px] z-50 bg-[#1B2B1F] text-[#FAF9F6] rounded-3xl p-5 shadow-2xl border border-[#2D4632] animate-in slide-in-from-bottom-5 duration-200">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2D4632]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#3A5A40] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Play className="w-3.5 h-3.5 fill-white text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#BDC9BF]">
            Hackathon Guided Walkthrough
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#A3B899] font-bold">
            Step {current.stepNumber} / 14
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#BDC9BF] hover:text-white hover:bg-[#2D4632] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="my-4 space-y-2">
        <h4 className="text-base font-serif font-bold text-white">
          {current.title}
        </h4>
        <p className="text-xs text-[#BDC9BF] leading-relaxed">
          {current.description}
        </p>

        {/* Quick Action Button for this step */}
        <button
          onClick={current.onAction}
          className="mt-2 w-full py-2.5 px-3 bg-[#2D4632] hover:bg-[#3A5A40] text-[#FAF9F6] border border-[#3A5A40] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D9A05B]" />
          <span>Execute: {current.actionText}</span>
        </button>
      </div>

      {/* Stepper Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-[#2D4632]">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="px-3 py-1.5 rounded-xl bg-[#2D4632] hover:bg-[#3A5A40] text-xs font-semibold text-[#FAF9F6] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1">
          {demoSteps.map((_, i) => (
            <span
              key={i}
              onClick={() => {
                setCurrentStep(i);
                demoSteps[i].onAction();
              }}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${
                i === currentStep ? 'w-4 bg-[#BDC9BF]' : 'w-1.5 bg-[#2D4632] hover:bg-[#3A5A40]'
              }`}
            />
          ))}
        </div>

        {currentStep < demoSteps.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-4 py-1.5 rounded-xl bg-[#3A5A40] hover:bg-[#4A7C44] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#3A5A40] hover:bg-[#4A7C44] text-white text-xs font-bold transition shadow-sm"
          >
            <span>Finish Tour</span>
          </button>
        )}
      </div>

    </div>
  );
};
