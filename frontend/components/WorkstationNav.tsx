'use client';

import React, { useState } from 'react';
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
import { NetworkModeModal } from './NetworkModeModal';

export type NavTab =
  | 'HOME'
  | 'DATA'
  | 'EXPLORE'
  | 'SEARCH'
  | 'INSIGHTS'
  | 'ANOMALIES'
  | 'TOPICS'
  | 'CORRELATE'
  | 'GEOMAP'
  | 'SPATIAL';

interface DatasetItem {
  id: string;
  name: string;
  totalEvents?: number;
}

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
  datasets?: DatasetItem[];
  activeDatasetId?: string;
  onSelectDataset?: (id: string) => void;
  onOpenProcessingModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenAssistant?: () => void;
  onOpenMobileServer?: () => void;
}

export function WorkstationNav({
  currentTab,
  onSelectTab,
  activeJob,
  datasetCount = 0,
  totalRecords = 0,
  datasets = [],
  activeDatasetId,
  onSelectDataset,
  onOpenProcessingModal,
  onOpenCommandPalette,
  onOpenAssistant,
  onOpenMobileServer,
}: WorkstationNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  React.useEffect(() => {
    fetch('/api/v1/online/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isOnlineModeEnabled !== undefined) {
          setIsOnline(data.isOnlineModeEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const primaryTabs: Array<{ tab: NavTab; label: string; icon: React.ReactNode }> = [
    { tab: 'HOME', label: 'HOME', icon: <HomeIcon className="w-3.5 h-3.5" /> },
    { tab: 'DATA', label: 'DATA', icon: <DatabaseIcon className="w-3.5 h-3.5" /> },
    { tab: 'EXPLORE', label: 'EXPLORE', icon: <ExploreIcon className="w-3.5 h-3.5" /> },
    { tab: 'SEARCH', label: 'SEARCH', icon: <SearchIcon className="w-3.5 h-3.5" /> },
    { tab: 'INSIGHTS', label: 'INSIGHTS', icon: <InsightsIcon className="w-3.5 h-3.5" /> },
    { tab: 'ANOMALIES', label: 'ANOMALIES', icon: <AlertCircleIcon className="w-3.5 h-3.5" /> },
    { tab: 'TOPICS', label: 'TOPICS', icon: <LayersIcon className="w-3.5 h-3.5" /> },
  ];

  const secondaryTabs: Array<{ tab: NavTab; label: string; icon: React.ReactNode }> = [
    { tab: 'CORRELATE', label: 'CORRELATE', icon: <GitCompareIcon className="w-3.5 h-3.5" /> },
    { tab: 'GEOMAP', label: 'GEOMAP', icon: <span className="text-xs">🧭</span> },
    { tab: 'SPATIAL', label: '3D SPATIAL', icon: <span className="text-xs">🌌</span> },
  ];

  const isSecondaryActive = secondaryTabs.some((t) => t.tab === currentTab);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-black/60 backdrop-blur-2xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 font-mono">
        {/* Brand & System Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onSelectTab('HOME')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <span className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              TEXTBOARD <span className="text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40">5.0</span>
            </span>
          </div>

          {/* Direct Stream Selector Dropdown */}
          {datasets && datasets.length > 0 && onSelectDataset && (
            <div className="hidden lg:flex items-center gap-1 bg-black/50 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] text-neutral-400 uppercase">Stream:</span>
              <select
                value={activeDatasetId || ''}
                onChange={(e) => onSelectDataset(e.target.value)}
                className="bg-transparent text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id} className="bg-neutral-900 text-white">
                    {d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Primary Workstation Navigation Tabs with Overflow Menu */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1" role="tablist" aria-label="Workstation Viewports">
          {primaryTabs.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onSelectTab(item.tab)}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            );
          })}

          {/* Desktop full tabs for wide screens */}
          <div className="hidden 2xl:flex items-center gap-1">
            {secondaryTabs.map((item) => {
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => onSelectTab(item.tab)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={item.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Overflow Menu for Secondary Tabs on standard screens */}
          <div className="relative 2xl:hidden">
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all border cursor-pointer ${
                isSecondaryActive
                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-300 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <span>More</span>
              <span className="text-[10px]">▾</span>
            </button>

            {isMoreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsMoreOpen(false)} />
                <div className="absolute left-0 mt-2 w-48 rounded-xl bg-black/90 border border-white/[0.12] shadow-2xl p-1.5 z-40 backdrop-blur-2xl space-y-1">
                  {secondaryTabs.map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => {
                        onSelectTab(item.tab);
                        setIsMoreOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                        currentTab === item.tab
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
                          : 'text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Right Side: Assistant, Command Palette, 3-Theme Switcher & Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 text-xs transition-all shadow-sm cursor-pointer"
              title="Open Local AI Assistant (A)"
            >
              <span>🤖</span>
              <span className="hidden md:inline">AI ASSISTANT</span>
            </button>
          )}

          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-neutral-400 hover:text-cyan-300 hover:border-cyan-500/40 text-xs transition-all shadow-sm cursor-pointer"
              title="Open Command Palette (Ctrl+K)"
            >
              <span className="text-cyan-400 font-bold">⌘</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-black/40 text-[10px] text-neutral-500">
                Ctrl+K
              </kbd>
            </button>
          )}

          {/* Network Airgap / Online Mode Selector Badge */}
          <button
            onClick={() => setIsNetworkModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isOnline
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
            }`}
            title="Configure Network Policy & Airgap Isolation"
          >
            <span>{isOnline ? '🌐' : '🔒'}</span>
            <span className="hidden lg:inline">{isOnline ? 'ONLINE' : 'AIRGAP'}</span>
          </button>

          {/* Mobile Workstation Host IP / Standalone Switcher */}
          {onOpenMobileServer && (
            <button
              onClick={onOpenMobileServer}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/[0.1] bg-black/40 text-xs font-bold text-neutral-300 hover:text-white hover:border-cyan-400/40 transition-all cursor-pointer"
              title="Configure Workstation Host IP or Standalone Mode"
            >
              <span>📱</span>
              <span className="hidden sm:inline">PC SYNC</span>
            </button>
          )}

          <ThemeSwitcher />

          <NetworkModeModal
            isOpen={isNetworkModalOpen}
            onClose={() => setIsNetworkModalOpen(false)}
            onSettingsChanged={(online) => setIsOnline(online)}
          />

          {activeJob ? (
            <button
              onClick={onOpenProcessingModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs hover:opacity-90 transition-opacity animate-pulse shadow-md"
              title="View Ingestion Progress"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span className="hidden sm:inline">INGESTING</span>
              <span>({activeJob.progress}%)</span>
            </button>
          ) : (
            <div className="hidden xl:flex items-center gap-2.5 text-xs text-neutral-500">
              <span>
                STREAMS: <strong className="text-white font-bold">{datasetCount}</strong>
              </span>
              <span className="text-neutral-700">|</span>
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
