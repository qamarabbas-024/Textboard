import React from 'react';
import {
  DatabaseIcon,
  UsersIcon,
  ActivityIcon,
  SparklesIcon,
  ArrowRightIcon,
  SearchIcon,
  TerminalIcon,
  ClockIcon,
} from './Icons';
import { OnThisDayView } from './OnThisDayView';

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
  onNavigateTo: (tab: 'DATA' | 'EXPLORE' | 'SEARCH' | 'INSIGHTS') => void;
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
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Telemetry HUD Banner */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#10141d]/80 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="font-mono text-xs tracking-wider uppercase">DATASETS MOUNTED</span>
            <DatabaseIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100">
            {datasets.length}
          </div>
          <div className="mt-2 text-[11px] font-mono text-neutral-500">
            Local SQLite WAL Partition
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#10141d]/80 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="font-mono text-xs tracking-wider uppercase">NORMALIZED RECORDS</span>
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100">
            {totalRecordsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] font-mono text-neutral-500">
            Across all imported archives
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#10141d]/80 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="font-mono text-xs tracking-wider uppercase">IDENTIFIED ACTORS</span>
            <UsersIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100">
            {totalParticipantsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] font-mono text-neutral-500">
            Distinct resolved entities
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#10141d]/80 border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="font-mono text-xs tracking-wider uppercase">ACTIVE FOCUS</span>
            <ActivityIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-semibold font-mono text-neutral-100 truncate">
            {activeDataset ? activeDataset.name : 'No Dataset Selected'}
          </div>
          <div className="mt-2 text-[11px] font-mono text-cyan-400 truncate">
            {activeDataset ? `${activeDataset.totalEvents.toLocaleString()} records` : 'Import a file to start'}
          </div>
        </div>
      </section>

      {/* 2. Key Verifiable Insights Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              DETERMINISTIC INSIGHTS (VERIFIABLE)
            </h2>
          </div>
          <button
            onClick={() => onNavigateTo('INSIGHTS')}
            className="font-mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Insights</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {insights.length === 0 ? (
          <div className="p-8 rounded-xl border border-white/[0.06] bg-[#10141d]/40 text-center font-mono text-xs text-neutral-500">
            Select or import a dataset to generate verifiable personal intelligence.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                      {insight.category}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500">
                      {Math.round(insight.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>
                  <h3 className="font-semibold text-neutral-100 text-sm mb-2">{insight.title}</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">{insight.summary}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span className="truncate">
                    {Object.entries(insight.supportingData)[0]
                      ? `${Object.entries(insight.supportingData)[0][0]}: ${Object.entries(insight.supportingData)[0][1]}`
                      : 'Audited'}
                  </span>
                  <span className="text-cyan-400">Traceable</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Memory Time Machine (On This Day in History) */}
      {activeDataset && (
        <section>
          <OnThisDayView
            datasetId={activeDataset.id}
            onExploreDate={() => onNavigateTo('EXPLORE')}
          />
        </section>
      )}

      {/* 4. Recent Datasets Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-neutral-400" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              REGISTERED DATASETS
            </h2>
          </div>
          <button
            onClick={() => onNavigateTo('DATA')}
            className="font-mono text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
          >
            <span>Manage & Import</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {datasets.length === 0 ? (
          <div className="p-12 rounded-xl border border-dashed border-white/[0.1] bg-[#10141d]/40 text-center font-mono space-y-3">
            <DatabaseIcon className="w-8 h-8 text-neutral-500 mx-auto" />
            <p className="text-xs text-neutral-400">No datasets imported yet.</p>
            <button
              onClick={() => onNavigateTo('DATA')}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-neutral-950 font-semibold text-xs hover:bg-cyan-400 transition-colors"
            >
              Import Your First Archive
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#10141d]/80 font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-neutral-400 text-[11px] tracking-wider">
                  <th className="p-4">DATASET NAME</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">RECORDS</th>
                  <th className="p-4">DATE SPAN</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {datasets.map((ds) => {
                  const isSelected = ds.id === selectedDatasetId;
                  return (
                    <tr
                      key={ds.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isSelected ? 'bg-cyan-500/[0.04]' : ''
                      }`}
                    >
                      <td className="p-4 font-medium text-neutral-100 flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        <span>{ds.name}</span>
                      </td>
                      <td className="p-4 text-neutral-400 uppercase text-[11px]">
                        {ds.sourceType}
                      </td>
                      <td className="p-4 text-cyan-300 font-semibold">
                        {ds.totalEvents.toLocaleString()}
                      </td>
                      <td className="p-4 text-neutral-400 text-[11px]">
                        {ds.startDate && ds.endDate
                          ? `${new Date(ds.startDate).toLocaleDateString()} - ${new Date(
                              ds.endDate,
                            ).toLocaleDateString()}`
                          : 'Recorded'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            onSelectDataset(ds.id);
                            onNavigateTo('EXPLORE');
                          }}
                          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-cyan-500/20 hover:text-cyan-300 text-neutral-300 transition-colors"
                        >
                          Explore
                        </button>
                        <button
                          onClick={() => {
                            onSelectDataset(ds.id);
                            onNavigateTo('SEARCH');
                          }}
                          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 transition-colors"
                        >
                          Search
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
