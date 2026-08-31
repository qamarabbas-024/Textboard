'use client';

import React from 'react';
import { NavTab } from './WorkstationNav';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPodcast?: () => void;
}

export function MobileBottomNav({
  currentTab,
  onSelectTab,
  onOpenPodcast,
}: MobileBottomNavProps) {
  const tabs = [
    { id: 'HOME' as NavTab, label: 'Home', icon: '🏠' },
    { id: 'DATA' as NavTab, label: 'Data', icon: '📁' },
    { id: 'EXPLORE' as NavTab, label: 'Explore', icon: '🧭' },
    { id: 'SEARCH' as NavTab, label: 'Search', icon: '🔍' },
    { id: 'ANOMALIES' as NavTab, label: 'Anomalies', icon: '🚨' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 pb-safe flex items-center justify-around font-mono">
      {tabs.map((t) => {
        const isActive = currentTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
