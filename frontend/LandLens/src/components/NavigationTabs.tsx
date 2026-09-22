import React from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  FolderSync, 
  AlertCircle, 
  FileText,
  Sparkles
} from 'lucide-react';
import { ActiveTab, Language } from '../types';
import { translations } from '../data/i18n';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onChangeTab?: (tab: ActiveTab) => void;
  reviewCount?: number;
  reviewBadgeCount?: number;
  language: Language;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  onChangeTab,
  reviewCount,
  reviewBadgeCount,
  language,
}) => {
  const t = translations[language];
  const count = reviewCount ?? reviewBadgeCount ?? 0;

  const handleSelect = (tab: ActiveTab) => {
    if (onTabChange) onTabChange(tab);
    if (onChangeTab) onChangeTab(tab);
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'map', label: t.map, icon: MapIcon },
    { id: 'data', label: t.data, icon: FolderSync },
    { id: 'review', label: t.review, icon: AlertCircle, badge: count },
    { id: 'reports', label: t.reports, icon: FileText },
  ];

  return (
    <nav aria-label="Main Navigation" className="bg-white border-b border-[#E8E6E1] shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-8 overflow-x-auto no-scrollbar py-2 sm:py-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`flex items-center gap-2 py-3.5 px-3.5 border-b-2 text-sm font-semibold whitespace-nowrap transition-all rounded-t-xl sm:rounded-none ${
                  isActive
                    ? 'border-[#3A5A40] text-[#3A5A40] bg-[#EAF2EA]/50 sm:bg-transparent font-bold'
                    : 'border-transparent text-[#5E6660] hover:text-[#1B2B1F] hover:border-[#D1CFCA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#3A5A40]' : 'text-[#A3A9A5]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold border transition ${
                    isActive 
                      ? 'bg-[#FFF9F0] text-[#B07D3E] border-[#FDEACD]' 
                      : 'bg-[#F1F3F0] text-[#5E6660] border-[#E8E6E1]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
