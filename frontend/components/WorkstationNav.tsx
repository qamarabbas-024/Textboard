'use client';

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
  onOpenCommandPalette?: () => void;
  onOpenAssistant?: () => void;
}

export function WorkstationNav({
  currentTab,
  onSelectTab,
  activeJob,
  datasetCount = 0,
  totalRecords = 0,
  onOpenProcessingModal,
  onOpenCommandPalette,
  onOpenAssistant,
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
    <header className="sticky top-0 z-40 w-full border-b border-theme-border/60 bg-theme-surface/80 backdrop-blur-2xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & System Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('HOME')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <span className="font-mono text-sm font-black tracking-wider text-white uppercase">
              TEXTBOARD <span className="text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40">3.0</span>
            </span>
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-theme-border font-mono text-[11px] text-theme-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            100% LOCAL-FIRST
          </div>
        </div>

        {/* Primary Workstation Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onSelectTab(item.tab)}
                aria-label={item.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md font-bold'
                    : 'text-theme-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Assistant, Command Palette Trigger, Theme Switcher & System Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 font-mono text-xs transition-all shadow-sm cursor-pointer"
              title="Open Local AI Assistant (A)"
            >
              <span>🤖</span>
              <span className="hidden md:inline">AI ASSISTANT</span>
            </button>
          )}

          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-theme-surface border border-theme-border/60 text-theme-muted hover:text-cyan-300 hover:border-cyan-500/40 font-mono text-xs transition-all shadow-sm cursor-pointer"
              title="Open Command Palette (Ctrl+K)"
            >
              <span className="text-cyan-400 font-bold">⌘</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-black/40 text-[10px] text-theme-muted">
                Ctrl+K
              </kbd>
            </button>
          )}

          <ThemeSwitcher />

          {activeJob ? (
            <button
              onClick={onOpenProcessingModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-xs hover:opacity-90 transition-opacity animate-pulse shadow-md"
              title="View Ingestion Progress"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span className="hidden sm:inline">INGESTING</span>
              <span>({activeJob.progress}%)</span>
            </button>
          ) : (
            <div className="hidden xl:flex items-center gap-2.5 font-mono text-xs text-theme-dim">
              <span>
                STREAMS: <strong className="text-white font-bold">{datasetCount}</strong>
              </span>
              <span className="text-theme-dim">|</span>
              <span>
                RECORDS: <strong className="text-emerald-400 font-bold">{totalRecords.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


