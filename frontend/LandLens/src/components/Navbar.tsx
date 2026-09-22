import React from 'react';
import { 
  Compass, 
  Globe2, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  Layers, 
  User, 
  ChevronDown, 
  CheckCircle2, 
  Play
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/i18n';

interface NavbarProps {
  currentZone?: string;
  onZoneChange?: (zone: string) => void;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onToggleLanguage?: () => void;
  isOnline?: boolean;
  onToggleOnline?: () => void;
  onStartReconciliation?: () => void;
  onStartDemoTour: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentZone = "Ward 112 - Domlur, Bengaluru Urban (Pilot 4)",
  onZoneChange = (_zone: string) => {},
  language,
  onLanguageChange,
  onToggleLanguage,
  isOnline = true,
  onToggleOnline = () => {},
  onStartReconciliation = () => {},
  onStartDemoTour,
}) => {
  const t = translations[language];

  const handleLanguageSwitch = (lang: Language) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else if (onToggleLanguage) {
      onToggleLanguage();
    }
  };

  return (
    <header className="bg-white border-b border-[#E8E6E1] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Ecosystem Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3A5A40] rounded-xl flex items-center justify-center shadow-md text-white shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-[#1B2B1F] leading-none">
                  Land<span className="text-[#3A5A40]">Lens</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#EAF2EA] text-[#4A7C44] px-2 py-0.5 rounded-full border border-[#BDC9BF]/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C44] animate-pulse"></span>
                  NAKSHA
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#5E6660] font-semibold mt-1 hidden sm:block">
                NAKSHA Geospatial Hub
              </p>
            </div>
          </div>

          {/* Center Pilot Zone Selector */}
          <div className="hidden md:flex items-center">
            <div className="relative flex items-center bg-[#F8F9F8] hover:bg-[#F1F3F0] border border-[#E8E6E1] rounded-xl px-3 py-1.5 transition text-sm">
              <Layers className="w-4 h-4 text-[#3A5A40] mr-2 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-[#A3A9A5] font-bold uppercase tracking-wider block">Pilot Zone</span>
                <select 
                  aria-label="Pilot Zone"
                  value={currentZone}
                  onChange={(e) => onZoneChange(e.target.value)}
                  className="bg-transparent font-semibold text-[#1B2B1F] focus:outline-none cursor-pointer pr-5 text-xs sm:text-sm"
                >
                  <option value="Ward 112 - Domlur, Bengaluru Urban (Pilot 4)">Ward 112 - Domlur, Bengaluru (Pilot 4)</option>
                  <option value="Lucknow Municipal Zone 4">Lucknow Municipal Zone 4</option>
                  <option value="Sector 18 - Gandhinagar, Gujarat">Sector 18 - Gandhinagar, Gujarat</option>
                  <option value="Zone 7 - Civil Lines, Jaipur">Zone 7 - Civil Lines, Jaipur</option>
                </select>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#A3A9A5] pointer-events-none absolute right-2.5" />
            </div>
          </div>

          {/* Right Tools: Tour, Online Status, Language, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Demo Walkthrough Button */}
            <button
              onClick={onStartDemoTour}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF2EA] hover:bg-[#D6E0D8] text-[#3A5A40] text-xs font-bold border border-[#BDC9BF] shadow-2xs transition active:scale-95"
              title="Start guided interactive demonstration"
            >
              <Play className="w-3.5 h-3.5 fill-[#3A5A40] text-[#3A5A40]" />
              <span className="hidden sm:inline">Guided Demo Tour</span>
              <span className="sm:hidden">Tour</span>
            </button>

            {/* Reconciliation Trigger Action */}
            <button
              onClick={onStartReconciliation}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3A5A40] hover:bg-[#2D4632] text-white text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.startReconciliation}</span>
            </button>

            {/* Online / Offline Status Toggle */}
            <button
              onClick={onToggleOnline}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                isOnline 
                  ? 'bg-[#F1F3F0] border-[#E8E6E1] text-[#2D312E] hover:bg-[#EAF2EA]' 
                  : 'bg-[#FFF9F0] border-[#FDEACD] text-[#B07D3E] hover:bg-[#faebd7]'
              }`}
              title={isOnline ? "System online. Tap to simulate offline mode." : "Offline mode active. Tap to sync."}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#4CAF50]' : 'bg-[#D9A05B]'}`}></span>
              <span>{isOnline ? t.online : 'Offline'}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center gap-3 px-2 text-sm font-semibold">
              <button
                onClick={() => handleLanguageSwitch('en')}
                className={`transition pb-0.5 text-xs font-bold ${
                  language === 'en'
                    ? 'text-[#3A5A40] border-b-2 border-[#3A5A40]'
                    : 'text-[#A3A9A5] hover:text-[#3A5A40]'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageSwitch('hi')}
                className={`transition pb-0.5 text-xs font-bold ${
                  language === 'hi'
                    ? 'text-[#3A5A40] border-b-2 border-[#3A5A40]'
                    : 'text-[#A3A9A5] hover:text-[#3A5A40]'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-[#E8E6E1]">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[#1B2B1F]">Anil Sharma</p>
                <p className="text-[10px] text-[#5E6660]">Revenue Officer</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#D6E0D8] border border-[#BDC9BF] flex items-center justify-center text-[#3A5A40] font-bold text-xs shadow-2xs">
                AS
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
