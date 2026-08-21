import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  UsersIcon,
  ActivityIcon,
  SmileIcon,
  FileTextIcon,
  LinkIcon,
  SearchIcon,
  RefreshCwIcon,
} from './Icons';
import { StreamTimelineView } from './StreamTimelineView';
import { ActivityHeatmap } from './ActivityHeatmap';
import { PdfExportModal } from './PdfExportModal';
import { RelationshipMatrix } from './RelationshipMatrix';
import { OnThisDayView } from './OnThisDayView';

export type ExploreSubTab = 'timeline' | 'people' | 'activity' | 'emoji' | 'topics' | 'links';

interface DatasetItem {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
}

interface ExploreViewProps {
  datasets: DatasetItem[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
}

export function ExploreView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: ExploreViewProps) {
  const [subTab, setSubTab] = useState<ExploreSubTab>('timeline');
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;

  useEffect(() => {
    if (!activeDataset) return;
    setIsLoading(true);
    fetch(`/api/v1/analytics/${activeDataset.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAnalytics(data))
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setIsLoading(false));
  }, [activeDataset?.id]);

  if (!activeDataset) {
    return (
      <div className="p-12 text-center font-mono text-xs text-neutral-500 rounded-xl border border-white/[0.08] bg-[#10141d]/80">
        No dataset selected. Import or select a dataset to explore.
      </div>
    );
  }

  const subTabs: Array<{ id: ExploreSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'timeline', label: 'TIMELINE', icon: <ClockIcon className="w-4 h-4" /> },
    { id: 'people', label: 'PEOPLE', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'activity', label: 'ACTIVITY', icon: <ActivityIcon className="w-4 h-4" /> },
    { id: 'emoji', label: 'EMOJI', icon: <SmileIcon className="w-4 h-4" /> },
    { id: 'topics', label: 'TOPICS', icon: <FileTextIcon className="w-4 h-4" /> },
    { id: 'links', label: 'LINKS', icon: <LinkIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Dataset Selector & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.08] bg-[#10141d]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={activeDataset.id}
                onChange={(e) => onSelectDataset(e.target.value)}
                className="bg-[#151b26] border border-white/[0.12] rounded px-2.5 py-1 text-xs text-neutral-100 font-semibold focus:outline-none focus:border-cyan-500/50"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.totalEvents.toLocaleString()} records)
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-neutral-500">
              Type: {activeDataset.sourceType.toUpperCase()} | Total Records: {activeDataset.totalEvents.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1">
            {subTabs.map((t) => {
              const isActive = subTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/[0.12] hover:border-cyan-500/40 text-xs font-semibold transition-all whitespace-nowrap shadow-xs"
              title="Export Visual PDF Archive"
            >
              <span>📄</span>
              <span>PDF</span>
            </button>
            <a
              href={`/api/v1/datasets/${activeDataset.id}/export/csv`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/[0.12] hover:border-cyan-500/40 text-xs font-semibold transition-all whitespace-nowrap shadow-xs"
              title="Export Raw CSV"
            >
              <span>📊</span>
              <span>CSV</span>
            </a>
            <a
              href={`/api/v1/datasets/${activeDataset.id}/export/json`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/[0.12] hover:border-cyan-500/40 text-xs font-semibold transition-all whitespace-nowrap shadow-xs"
              title="Export Structured JSON"
            >
              <span>📦</span>
              <span>JSON</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {subTab === 'timeline' && (
        <section className="rounded-xl border border-white/[0.08] bg-[#10141d]/80 p-4">
          <StreamTimelineView datasetId={activeDataset.id} />
        </section>
      )}

      {subTab === 'people' && analytics && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.messageAnalytics?.byPerson.map((person: any, idx: number) => (
              <div
                key={person.actor}
                className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[11px] font-bold text-cyan-400">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-neutral-100 text-sm truncate">{person.actor}</h3>
                  </div>
                  <span className="text-cyan-400 text-xs font-bold">{person.percentage}%</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${person.percentage}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 pt-2 border-t border-white/[0.05]">
                  <div>
                    <span className="text-neutral-500 block">MESSAGES</span>
                    <span className="text-neutral-200 font-semibold">{person.messageCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">AVG LENGTH</span>
                    <span className="text-neutral-200 font-semibold">{person.avgChars} chars</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pairwise Relationship Dynamics & Interaction Flow */}
          <div className="mt-6">
            <RelationshipMatrix relationships={analytics.relationships} />
          </div>
        </section>
      )}

      {subTab === 'activity' && analytics && (
        <section className="space-y-6">
          {/* 24/7 Activity Heatmap Matrix */}
          <ActivityHeatmap
            data={{
              byDayOfWeek: analytics.messageAnalytics?.byDayOfWeek,
              byHourOfDay: analytics.activityAnalytics?.byHourOfDay,
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day of Week Breakdown */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
              <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                DAY OF WEEK DISTRIBUTION
              </h3>
              <div className="space-y-2">
                {analytics.messageAnalytics?.byDayOfWeek.map((day: any) => (
                  <div key={day.dayName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-300">
                      <span>{day.dayName}</span>
                      <span className="text-neutral-400">
                        {day.count.toLocaleString()} ({day.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${day.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streaks & Gaps Overview */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
              <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                CONVERSATION CADENCE & STREAKS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-neutral-500 text-[11px] block">LONGEST STREAK</span>
                  <span className="text-xl font-bold text-cyan-300">
                    {analytics.activityAnalytics?.longestStreak?.days || 0} DAYS
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    {analytics.activityAnalytics?.longestStreak?.startDate} to {analytics.activityAnalytics?.longestStreak?.endDate}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-neutral-500 text-[11px] block">LONGEST GAP</span>
                  <span className="text-xl font-bold text-amber-300">
                    {analytics.activityAnalytics?.longestGap?.days || 0} DAYS
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Quiet period between messages
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs space-y-1">
                <div className="flex justify-between text-neutral-400">
                  <span>TOTAL ACTIVE DAYS:</span>
                  <strong className="text-neutral-200">{analytics.activityAnalytics?.totalActiveDays || 0}</strong>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>AVG DAILY VOLUME:</span>
                  <strong className="text-neutral-200">{analytics.activityAnalytics?.averageMessagesPerActiveDay || 0} msgs/day</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Time Machine inside Activity Tab */}
          <div className="mt-6">
            <OnThisDayView datasetId={activeDataset.id} />
          </div>
        </section>
      )}

      {subTab === 'emoji' && analytics && (
        <section className="space-y-6">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              EMOJI LEADERBOARD (TOTAL: {analytics.emojiAnalytics?.totalEmojis?.toLocaleString()})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {analytics.emojiAnalytics?.topEmojis?.slice(0, 16).map((em: any, idx: number) => (
                <div
                  key={em.emoji}
                  className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-center hover:border-cyan-500/40 transition-colors"
                >
                  <div className="text-2xl mb-1">{em.emoji}</div>
                  <div className="text-xs font-bold text-neutral-200">{em.count.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-500">#{idx + 1} ({em.percentage}%)</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === 'topics' && analytics && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Words */}
          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              FREQUENT KEYWORDS
            </h3>
            <div className="flex flex-wrap gap-2">
              {analytics.textAnalytics?.topWords?.slice(0, 40).map((w: any) => (
                <span
                  key={w.word}
                  className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-200 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                >
                  {w.word} <strong className="text-cyan-400 font-normal">({w.count})</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Top Bigram Phrases */}
          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              RECURRING PHRASES (N-GRAMS)
            </h3>
            <div className="space-y-2">
              {analytics.textAnalytics?.topPhrases?.slice(0, 10).map((p: any) => (
                <div key={p.phrase} className="flex items-center justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-xs">
                  <span className="text-neutral-200 font-medium">{p.phrase}</span>
                  <span className="text-cyan-400 font-semibold">{p.count} times</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === 'links' && analytics && (
        <section className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
            SHARED WEB URLS ({analytics.textAnalytics?.urls?.length || 0})
          </h3>
          <div className="space-y-2">
            {analytics.textAnalytics?.urls?.map((link: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/30 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate mr-4">
                  <LinkIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-200 hover:text-cyan-300 truncate underline"
                  >
                    {link.url}
                  </a>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[11px] text-neutral-400 shrink-0">
                  {link.domain}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full Chat PDF Export Modal */}
      {isExportOpen && (
        <PdfExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          datasetId={activeDataset.id}
          datasetName={activeDataset.name}
          totalEvents={activeDataset.totalEvents}
        />
      )}
    </div>
  );
}
