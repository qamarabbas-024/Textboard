import React from 'react';
import {
  HomeIcon,
  DatabaseIcon,
  ExploreIcon,
  SearchIcon,
  InsightsIcon,
  CpuIcon,
  RefreshCwIcon,
} from './Icons';
import { ThemeSwitcher } from './ThemeSwitcher';

export type NavTab = 'HOME' | 'DATA' | 'EXPLORE' | 'SEARCH' | 'INSIGHTS';

interface WorkstationNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeJob?: {
    jobId: string;
    datasetName?: string;
    progress: number;
    processedRows: number;
    step?: string;
  } | null;
  datasetCount?: number;
  totalRecords?: number;
  onOpenProcessingModal?: () => void;
}

export function WorkstationNav({
  currentTab,
  onSelectTab,
  activeJob,
  datasetCount = 0,
  totalRecords = 0,
  onOpenProcessingModal,
}: WorkstationNavProps) {
  const navItems: Array<{ tab: NavTab; label: string; icon: React.ReactNode }> = [
    { tab: 'HOME', label: 'HOME', icon: <HomeIcon className="w-4 h-4" /> },
    { tab: 'DATA', label: 'DATA', icon: <DatabaseIcon className="w-4 h-4" /> },
    { tab: 'EXPLORE', label: 'EXPLORE', icon: <ExploreIcon className="w-4 h-4" /> },
    { tab: 'SEARCH', label: 'SEARCH', icon: <SearchIcon className="w-4 h-4" /> },
    { tab: 'INSIGHTS', label: 'INSIGHTS', icon: <InsightsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0c0e14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand & System Mode */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <span className="font-mono text-sm font-semibold tracking-wider text-neutral-100 uppercase">
              TEXTBOARD <span className="text-cyan-400 text-xs font-normal">v1.0</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LOCAL-FIRST ENGINE
          </div>
        </div>

        {/* Primary Workstation Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onSelectTab(item.tab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-mono text-xs tracking-wider transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Theme Switcher & System Telemetry */}
        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          {activeJob ? (
            <button
              onClick={onOpenProcessingModal}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs hover:bg-cyan-900/60 transition-colors animate-pulse"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>INGESTING ({activeJob.progress}%)</span>
            </button>
          ) : (
            <div className="hidden lg:flex items-center gap-3 font-mono text-xs text-neutral-400">
              <span>
                DATASETS: <strong className="text-neutral-200">{datasetCount}</strong>
              </span>
              <span className="text-neutral-600">|</span>
              <span>
                RECORDS: <strong className="text-neutral-200">{totalRecords.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
