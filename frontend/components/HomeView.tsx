'use client';

import React from 'react';
import {
  DatabaseIcon,
  UsersIcon,
  ActivityIcon,
  SparklesIcon,
  ArrowRightIcon,
  SearchIcon,
  TerminalIcon,
  AlertCircleIcon,
  LayersIcon,
  GitCompareIcon,
} from './Icons';
import { OnThisDayView } from './OnThisDayView';
import { Button } from './ui/Button';

interface DatasetSummary {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

interface InsightItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  confidence: number;
  supportingData: Record<string, any>;
}

interface HomeViewProps {
  datasets: DatasetSummary[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onNavigateTo: (tab: any) => void;
  insights: InsightItem[];
  totalRecordsCount: number;
  totalParticipantsCount: number;
}

export function HomeView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onNavigateTo,
  insights,
  totalRecordsCount,
  totalParticipantsCount,
}: HomeViewProps) {
  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;

  return (
    <div className="space-y-8 animate-fadeIn font-mono">
      {/* 1. Hero 3D Command Deck Banner */}
      <section className="glass-card-3d p-8 rounded-3xl relative overflow-hidden group border border-theme-border/80 shadow-2xl">
        {/* Subtle 3D Ambient Mesh Glow Background */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none group-hover:bg-purple-500/15 transition-all duration-700" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_12px_#00f0ff]" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-400/30 shadow-inner">
                LOCAL-FIRST VISUAL INTELLIGENCE WORKSTATION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              High-Throughput Analytics &amp; Forensic Stream Engine
            </h1>
            <p className="text-xs sm:text-sm text-theme-muted font-sans leading-relaxed">
              100% offline, zero-cloud data isolation. Analyze massive WhatsApp, Discord, Telegram, and CSV communication streams with deterministic precision.
            </p>
          </div>

          {/* Quick Action Matrix (3D Buttons) */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTo('DATA')}
              leftIcon={<DatabaseIcon className="w-4 h-4" />}
              className="btn-3d-primary font-bold shadow-lg"
            >
              Import Stream
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTo('EXPLORE')}
              leftIcon={<ActivityIcon className="w-4 h-4" />}
              className="glass-card-3d hover:border-cyan-400/60 font-semibold"
            >
              Timeline Scrubber
            </Button>
            <Button
              variant="accent-outline"
              size="sm"
              onClick={() => onNavigateTo('ANOMALIES')}
              leftIcon={<AlertCircleIcon className="w-4 h-4" />}
              className="glass-card-3d hover:border-rose-400/60 font-semibold"
            >
              Forensic Radar
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Telemetry HUD Cards (Elevated 3D Stat Layers) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card-3d relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="text-xs tracking-wider uppercase font-bold">DATASETS MOUNTED</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 shadow-inner">
              <DatabaseIcon className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight drop-shadow">
            {datasets.length}
          </div>
          <div className="mt-2 text-[11px] text-theme-dim flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Local SQLite WAL Partition
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card-3d relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="text-xs tracking-wider uppercase font-bold">NORMALIZED RECORDS</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20 shadow-inner">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-300 tracking-tight drop-shadow">
            {totalRecordsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-theme-dim flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Streamed in constant O(1) memory
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card-3d relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="text-xs tracking-wider uppercase font-bold">IDENTIFIED ACTORS</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-400/20 shadow-inner">
              <UsersIcon className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-300 tracking-tight drop-shadow">
            {totalParticipantsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-theme-dim flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Distinct resolved identities
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card-3d relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="text-xs tracking-wider uppercase font-bold">ACTIVE STREAM FOCUS</span>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-400/20 shadow-inner">
              <ActivityIcon className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-white truncate drop-shadow">
            {activeDataset ? activeDataset.name : 'No Stream Mounted'}
          </div>
          <div className="mt-2 text-[11px] text-cyan-400 truncate font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {activeDataset ? `${activeDataset.totalEvents.toLocaleString()} records` : 'Import a file to start'}
          </div>
        </div>
      </section>

      {/* 3. Workstation Navigation Launchpad Hub (3D Interactive Tiles) */}
      <section className="glass-card-3d p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-theme-border/50 pb-3">
          <LayersIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider text-white uppercase">
            WORKSTATION INTELLIGENCE MODULES
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { tab: 'DATA', label: 'Ingestion', icon: '📥', desc: 'Universal Stream Parsers' },
            { tab: 'EXPLORE', label: 'Timeline', icon: '📊', desc: 'Virtualized Scrubber' },
            { tab: 'SEARCH', label: 'Full Search', icon: '🔍', desc: 'Sub-ms Indexed Search' },
            { tab: 'INSIGHTS', label: 'Telemetry', icon: '✨', desc: 'Behavioral & Diurnal Radar' },
            { tab: 'ANOMALIES', label: 'Anomalies', icon: '🚨', desc: 'Forensic Threat Waves' },
            { tab: 'TOPICS', label: 'Clustering', icon: '🧠', desc: 'Semantic Discussion Trees' },
          ].map((mod) => (
            <button
              key={mod.tab}
              onClick={() => onNavigateTo(mod.tab)}
              className="p-4 rounded-xl glass-card-3d-interactive text-left group cursor-pointer"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 group-hover:-translate-y-1 transition-transform">
                {mod.icon}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                {mod.label}
              </div>
              <div className="text-[10px] text-theme-dim mt-0.5 line-clamp-1">{mod.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Verifiable Insights Carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold tracking-wider text-white uppercase">
              DETERMINISTIC INSIGHTS (TRACEABLE)
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTo('INSIGHTS')}
            rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
          >
            View All Insights
          </Button>
        </div>

        {insights.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card-3d text-center text-xs text-theme-dim">
            Select or import a dataset to generate verifiable personal intelligence.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="p-5 rounded-2xl glass-card-3d flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase tracking-wider font-bold">
                      {insight.category}
                    </span>
                    <span className="text-[10px] text-theme-dim">
                      {Math.round(insight.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{insight.title}</h3>
                  <p className="text-xs text-theme-muted leading-relaxed font-sans">
                    {insight.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-theme-border/50 flex items-center justify-between text-[11px] text-theme-dim">
                  <span className="truncate">
                    {Object.entries(insight.supportingData)[0]
                      ? `${Object.entries(insight.supportingData)[0][0]}: ${Object.entries(insight.supportingData)[0][1]}`
                      : 'Audited'}
                  </span>
                  <span className="text-cyan-400 font-bold">Traceable</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Memory Time Machine (On This Day in History) */}
      {activeDataset && (
        <section>
          <OnThisDayView
            datasetId={activeDataset.id}
            onExploreDate={() => onNavigateTo('EXPLORE')}
          />
        </section>
      )}

      {/* 6. Registered Datasets Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-theme-muted" />
            <h2 className="text-xs font-bold tracking-wider text-white uppercase">
              REGISTERED DATASETS ({datasets.length})
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTo('DATA')}
            rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
          >
            Manage &amp; Ingest
          </Button>
        </div>

        {datasets.length === 0 ? (
          <div className="p-12 rounded-2xl glass-card-3d text-center space-y-4">
            <DatabaseIcon className="w-10 h-10 text-theme-dim mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Communication Streams Ingested</h3>
              <p className="text-xs text-theme-muted font-sans">
                Drag and drop a WhatsApp export (.zip/.txt), Discord JSON, or CSV into the Data tab to start.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTo('DATA')}
            >
              Go to Data Ingestion
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => {
              const isSelected = dataset.id === selectedDatasetId;
              return (
                <div
                  key={dataset.id}
                  onClick={() => onSelectDataset(dataset.id)}
                  className={`p-5 rounded-2xl glass-card-3d cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected ? 'border-cyan-400 shadow-xl ring-1 ring-cyan-400/40' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase font-bold">
                        {dataset.sourceType}
                      </span>
                      <span className="text-[10px] text-theme-dim">
                        {new Date(dataset.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm truncate">{dataset.name}</h3>
                    <p className="text-xs text-theme-muted mt-1">
                      {dataset.totalEvents.toLocaleString()} records ingested
                    </p>
                  </div>

                  <div className="pt-3 border-t border-theme-border/50 flex items-center justify-between text-xs">
                    <span className="text-theme-dim text-[11px]">
                      {dataset.startDate && dataset.endDate
                        ? `${new Date(dataset.startDate).toLocaleDateString()} - ${new Date(dataset.endDate).toLocaleDateString()}`
                        : 'Continuous timeline'}
                    </span>
                    <Button
                      variant={isSelected ? 'accent-outline' : 'ghost'}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDataset(dataset.id);
                        onNavigateTo('EXPLORE');
                      }}
                    >
                      Explore
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


