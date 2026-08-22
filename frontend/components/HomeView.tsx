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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-theme-surface border border-theme-border relative overflow-hidden group hover:border-theme-border-hi transition-all shadow-xs">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="font-mono text-xs tracking-wider uppercase">DATASETS MOUNTED</span>
            <DatabaseIcon className="w-4 h-4 text-theme-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text">
            {datasets.length}
          </div>
          <div className="mt-2 text-[11px] font-mono text-theme-dim">
            Local SQLite WAL Partition
          </div>
        </div>

        <div className="p-5 rounded-xl bg-theme-surface border border-theme-border relative overflow-hidden group hover:border-theme-border-hi transition-all shadow-xs">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="font-mono text-xs tracking-wider uppercase">NORMALIZED RECORDS</span>
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text">
            {totalRecordsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] font-mono text-theme-dim">
            Across all imported archives
          </div>
        </div>

        <div className="p-5 rounded-xl bg-theme-surface border border-theme-border relative overflow-hidden group hover:border-theme-border-hi transition-all shadow-xs">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="font-mono text-xs tracking-wider uppercase">IDENTIFIED ACTORS</span>
            <UsersIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text">
            {totalParticipantsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] font-mono text-theme-dim">
            Distinct resolved entities
          </div>
        </div>

        <div className="p-5 rounded-xl bg-theme-surface border border-theme-border relative overflow-hidden group hover:border-theme-border-hi transition-all shadow-xs">
          <div className="flex items-center justify-between mb-3 text-theme-muted">
            <span className="font-mono text-xs tracking-wider uppercase">ACTIVE FOCUS</span>
            <ActivityIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-semibold font-mono text-theme-text truncate">
            {activeDataset ? activeDataset.name : 'No Dataset Selected'}
          </div>
          <div className="mt-2 text-[11px] font-mono text-theme-accent truncate">
            {activeDataset ? `${activeDataset.totalEvents.toLocaleString()} records` : 'Import a file to start'}
          </div>
        </div>
      </section>

      {/* 2. Key Verifiable Insights Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-theme-accent" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-theme-text uppercase">
              DETERMINISTIC INSIGHTS (VERIFIABLE)
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
          <div className="p-8 rounded-xl border border-theme-border bg-theme-surface/50 text-center font-mono text-xs text-theme-dim">
            Select or import a dataset to generate verifiable personal intelligence.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-theme-active text-theme-accent border border-theme-border-hi uppercase tracking-wider">
                      {insight.category}
                    </span>
                    <span className="font-mono text-[10px] text-theme-dim">
                      {Math.round(insight.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>
                  <h3 className="font-semibold text-theme-text text-sm mb-2">{insight.title}</h3>
                  <p className="text-xs text-theme-muted leading-relaxed font-sans">{insight.summary}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-theme-border flex items-center justify-between text-[11px] font-mono text-theme-dim">
                  <span className="truncate">
                    {Object.entries(insight.supportingData)[0]
                      ? `${Object.entries(insight.supportingData)[0][0]}: ${Object.entries(insight.supportingData)[0][1]}`
                      : 'Audited'}
                  </span>
                  <span className="text-theme-accent font-bold">Traceable</span>
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
            <DatabaseIcon className="w-4 h-4 text-theme-muted" />
            <h2 className="font-mono text-xs font-semibold tracking-wider text-theme-text uppercase">
              REGISTERED DATASETS
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTo('DATA')}
            rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
          >
            Manage & Import
          </Button>
        </div>

        {datasets.length === 0 ? (
          <div className="p-12 rounded-xl border border-dashed border-theme-border bg-theme-surface/40 text-center font-mono space-y-4">
            <DatabaseIcon className="w-8 h-8 text-theme-dim mx-auto" />
            <p className="text-xs text-theme-muted">No datasets imported yet.</p>
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigateTo('DATA')}
            >
              Import Your First Archive
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-theme-border bg-theme-surface font-mono text-xs shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-base/40 text-theme-muted text-[11px] tracking-wider">
                  <th className="p-4">DATASET NAME</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">RECORDS</th>
                  <th className="p-4">DATE SPAN</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {datasets.map((ds) => {
                  const isSelected = ds.id === selectedDatasetId;
                  return (
                    <tr
                      key={ds.id}
                      className={`hover:bg-theme-raised transition-colors ${
                        isSelected ? 'bg-theme-active/30' : ''
                      }`}
                    >
                      <td className="p-4 font-medium text-theme-text flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-theme-accent" />}
                        <span>{ds.name}</span>
                      </td>
                      <td className="p-4 text-theme-muted uppercase text-[11px]">
                        {ds.sourceType}
                      </td>
                      <td className="p-4 text-theme-accent font-semibold">
                        {ds.totalEvents.toLocaleString()}
                      </td>
                      <td className="p-4 text-theme-muted text-[11px]">
                        {ds.startDate && ds.endDate
                          ? `${new Date(ds.startDate).toLocaleDateString()} - ${new Date(
                              ds.endDate,
                            ).toLocaleDateString()}`
                          : 'Recorded'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={isSelected ? 'accent-outline' : 'secondary'}
                            size="xs"
                            onClick={() => {
                              onSelectDataset(ds.id);
                              onNavigateTo('EXPLORE');
                            }}
                          >
                            Explore
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              onSelectDataset(ds.id);
                              onNavigateTo('SEARCH');
                            }}
                          >
                            Search
                          </Button>
                        </div>
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
