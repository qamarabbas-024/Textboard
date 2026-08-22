import React from 'react';
import {
  HomeIcon,
  DatabaseIcon,
  ExploreIcon,
  SearchIcon,
  InsightsIcon,
  AlertCircleIcon,
  LayersIcon,
  GitCompareIcon,
  CpuIcon,
  RefreshCwIcon,
} from './Icons';
import { ThemeSwitcher } from './ThemeSwitcher';

export type NavTab =
  | 'HOME'
  | 'DATA'
  | 'EXPLORE'
  | 'SEARCH'
  | 'INSIGHTS'
  | 'ANOMALIES'
  | 'TOPICS'
  | 'CORRELATE';

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
    { tab: 'HOME', label: 'HOME', icon: <HomeIcon className="w-3.5 h-3.5" /> },
    { tab: 'DATA', label: 'DATA', icon: <DatabaseIcon className="w-3.5 h-3.5" /> },
    { tab: 'EXPLORE', label: 'EXPLORE', icon: <ExploreIcon className="w-3.5 h-3.5" /> },
    { tab: 'SEARCH', label: 'SEARCH', icon: <SearchIcon className="w-3.5 h-3.5" /> },
    { tab: 'INSIGHTS', label: 'INSIGHTS', icon: <InsightsIcon className="w-3.5 h-3.5" /> },
    { tab: 'ANOMALIES', label: 'ANOMALIES', icon: <AlertCircleIcon className="w-3.5 h-3.5" /> },
    { tab: 'TOPICS', label: 'TOPICS', icon: <LayersIcon className="w-3.5 h-3.5" /> },
    { tab: 'CORRELATE', label: 'CORRELATE', icon: <GitCompareIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-theme-border bg-theme-surface/95 backdrop-blur-md transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
        {/* Brand & System Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-theme-accent shadow-theme-glow" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-theme-text uppercase">
              TEXTBOARD <span className="text-theme-accent text-[11px] font-normal">v3.0</span>
            </span>
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-theme-base border border-theme-border font-mono text-[11px] text-theme-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LOCAL-FIRST ENGINE
          </div>
        </div>

        {/* Primary Workstation Navigation Tabs */}
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto py-1 max-w-full">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onSelectTab(item.tab)}
                aria-label={item.label}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg font-mono text-xs tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent cursor-pointer ${
                  isActive
                    ? 'bg-theme-active text-theme-accent border border-theme-border-hi shadow-theme-glow font-bold'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-raised border border-transparent'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Theme Switcher & System Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />

          {activeJob ? (
            <button
              onClick={onOpenProcessingModal}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-theme-active border border-theme-accent text-theme-accent font-mono text-xs hover:opacity-90 transition-opacity animate-pulse focus-visible:ring-2 focus-visible:ring-theme-accent"
              title="View Ingestion Progress"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-theme-accent" />
              <span className="hidden sm:inline">INGESTING</span>
              <span>({activeJob.progress}%)</span>
            </button>
          ) : (
            <div className="hidden xl:flex items-center gap-2.5 font-mono text-xs text-theme-dim">
              <span>
                DATASETS: <strong className="text-theme-text">{datasetCount}</strong>
              </span>
              <span className="text-theme-dim">|</span>
              <span>
                RECORDS: <strong className="text-theme-text">{totalRecords.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
