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
import { AnimatedScrubberTimeline } from './AnimatedScrubberTimeline';
import { RelationshipGraphView } from './RelationshipGraphView';
import { ActivityHeatmap } from './ActivityHeatmap';
import { PdfExportModal } from './PdfExportModal';
import { RelationshipMatrix } from './RelationshipMatrix';
import { OnThisDayView } from './OnThisDayView';
import { ForensicPodcastPlayer } from './ForensicPodcastPlayer';
import { EntityIntelligenceView } from './EntityIntelligenceView';
import { BatesStampingModal } from './BatesStampingModal';
import { safeFetch } from '../lib/api-client';
import { Button } from './ui/Button';

export type ExploreSubTab = 'timeline' | 'podcast' | 'entities' | 'network' | 'people' | 'activity' | 'emoji' | 'topics' | 'links';

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
  const [isBatesOpen, setIsBatesOpen] = useState(false);
  const [scrubbedDate, setScrubbedDate] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;

  useEffect(() => {
    if (!activeDataset) return;
    setIsLoading(true);
    safeFetch(`/api/v1/analytics/${activeDataset.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAnalytics(data))
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setIsLoading(false));
  }, [activeDataset?.id]);

  if (!activeDataset) {
    return (
      <div className="p-12 text-center font-mono text-xs text-theme-dim rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        No dataset selected. Import or select a dataset to explore.
      </div>
    );
  }

  const subTabs: Array<{ id: ExploreSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'timeline', label: 'TIMELINE', icon: <ClockIcon className="w-4 h-4" /> },
    { id: 'podcast', label: '🎙️ PODCAST / TTS', icon: <span className="text-sm">🎙️</span> },
    { id: 'entities', label: '🛡️ THREAT INTEL', icon: <span className="text-sm">🛡️</span> },
    { id: 'network', label: 'NETWORK', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'people', label: 'PEOPLE', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'activity', label: 'ACTIVITY', icon: <ActivityIcon className="w-4 h-4" /> },
    { id: 'emoji', label: 'EMOJI', icon: <SmileIcon className="w-4 h-4" /> },
    { id: 'topics', label: 'TOPICS', icon: <FileTextIcon className="w-4 h-4" /> },
    { id: 'links', label: 'LINKS', icon: <LinkIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Dataset Selector & Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-theme-active border border-theme-border-hi flex items-center justify-center text-theme-accent">
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={activeDataset.id}
                onChange={(e) => onSelectDataset(e.target.value)}
                className="bg-theme-base border border-theme-border rounded-lg px-2.5 py-1 text-xs text-theme-text font-semibold focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.totalEvents.toLocaleString()} records)
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-theme-dim">
              Type: {activeDataset.sourceType.toUpperCase()} | Total Records: {activeDataset.totalEvents.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {subTabs.map((t) => {
              const isActive = subTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs tracking-wider transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent cursor-pointer ${
                    isActive
                      ? 'bg-theme-active text-theme-accent border border-theme-border-hi font-bold shadow-theme-glow'
                      : 'text-theme-muted hover:text-theme-text hover:bg-theme-raised border border-transparent'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setIsBatesOpen(true)}
              title="Legal Bates Stamping & PII Redaction Studio"
            >
              ⚖️ BATES
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setIsExportOpen(true)}
              title="Export Visual PDF Archive"
            >
              📄 PDF
            </Button>
            <a
              href={`/api/v1/datasets/${activeDataset.id}/export/csv`}
              download
              className="inline-flex items-center justify-center font-semibold font-mono text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md gap-1 bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text transition-all"
              title="Export Raw CSV"
            >
              📊 CSV
            </a>
            <a
              href={`/api/v1/datasets/${activeDataset.id}/export/json`}
              download
              className="inline-flex items-center justify-center font-semibold font-mono text-[10px] sm:text-[11px] px-2.5 py-1 rounded-md gap-1 bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text transition-all"
              title="Export Structured JSON"
            >
              📦 JSON
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {subTab === 'timeline' && (
        <section className="space-y-4">
          <AnimatedScrubberTimeline
            datasetId={activeDataset.id}
            selectedRange={selectedRange}
            onRangeSelect={setSelectedRange}
            onDateScrub={(date) => {
              setScrubbedDate(date);
              setSelectedRange({
                start: new Date(date).toISOString(),
                end: new Date(new Date(date).getTime() + 86400000 * 7).toISOString(),
              });
            }}
          />
          <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-xs">
            <StreamTimelineView
              datasetId={activeDataset.id}
              selectedRange={selectedRange}
            />
          </div>
        </section>
      )}

      {subTab === 'podcast' && (
        <section className="space-y-4">
          <ForensicPodcastPlayer
            datasetId={activeDataset.id}
            datasetName={activeDataset.name}
          />
        </section>
      )}

      {subTab === 'entities' && (
        <section className="space-y-4">
          <EntityIntelligenceView datasetId={activeDataset.id} />
        </section>
      )}

      {subTab === 'network' && (
        <section className="space-y-4">
          <RelationshipGraphView
            datasetId={activeDataset.id}
            datasets={datasets}
            relationships={analytics?.relationships}
            people={analytics?.messageAnalytics?.byPerson}
          />
        </section>
      )}

      {subTab === 'people' && analytics && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.messageAnalytics?.byPerson.map((person: any, idx: number) => (
              <div
                key={person.actor}
                className="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-theme-active border border-theme-border-hi flex items-center justify-center text-[11px] font-bold text-theme-accent">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-theme-text text-sm truncate">{person.actor}</h3>
                  </div>
                  <span className="text-theme-accent text-xs font-bold">{person.percentage}%</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-theme-base overflow-hidden">
                  <div className="h-full bg-theme-accent rounded-full" style={{ width: `${person.percentage}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-theme-dim pt-2 border-t border-theme-border">
                  <div>
                    <span className="text-theme-muted block">MESSAGES</span>
                    <span className="text-theme-text font-semibold">{person.messageCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-theme-muted block">AVG LENGTH</span>
                    <span className="text-theme-text font-semibold">{person.avgChars} chars</span>
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
            <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
              <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
                DAY OF WEEK DISTRIBUTION
              </h3>
              <div className="space-y-2">
                {analytics.messageAnalytics?.byDayOfWeek.map((day: any) => (
                  <div key={day.dayName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-theme-muted">
                      <span>{day.dayName}</span>
                      <span className="text-theme-dim">
                        {day.count.toLocaleString()} ({day.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-theme-base overflow-hidden">
                      <div className="h-full bg-theme-accent rounded-full" style={{ width: `${day.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streaks & Gaps Overview */}
            <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
              <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
                CONVERSATION CADENCE & STREAKS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-theme-base border border-theme-border">
                  <span className="text-theme-muted text-[11px] block">LONGEST STREAK</span>
                  <span className="text-xl font-bold text-theme-accent">
                    {analytics.activityAnalytics?.longestStreak?.days || 0} DAYS
                  </span>
                  <span className="text-[10px] text-theme-dim block mt-1">
                    {analytics.activityAnalytics?.longestStreak?.startDate} to {analytics.activityAnalytics?.longestStreak?.endDate}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-theme-base border border-theme-border">
                  <span className="text-theme-muted text-[11px] block">LONGEST GAP</span>
                  <span className="text-xl font-bold text-amber-400">
                    {analytics.activityAnalytics?.longestGap?.days || 0} DAYS
                  </span>
                  <span className="text-[10px] text-theme-dim block mt-1">
                    Quiet period between messages
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-theme-base border border-theme-border text-xs space-y-1">
                <div className="flex justify-between text-theme-muted">
                  <span>TOTAL ACTIVE DAYS:</span>
                  <strong className="text-theme-text">{analytics.activityAnalytics?.totalActiveDays || 0}</strong>
                </div>
                <div className="flex justify-between text-theme-muted">
                  <span>AVG DAILY VOLUME:</span>
                  <strong className="text-theme-text">{analytics.activityAnalytics?.averageMessagesPerActiveDay || 0} msgs/day</strong>
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
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              EMOJI LEADERBOARD (TOTAL: {analytics.emojiAnalytics?.totalEmojis?.toLocaleString()})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {analytics.emojiAnalytics?.topEmojis?.slice(0, 16).map((em: any, idx: number) => (
                <div
                  key={em.emoji}
                  className="p-3 rounded-lg border border-theme-border bg-theme-base text-center hover:border-theme-border-hi transition-colors"
                >
                  <div className="text-2xl mb-1">{em.emoji}</div>
                  <div className="text-xs font-bold text-theme-text">{em.count.toLocaleString()}</div>
                  <div className="text-[10px] text-theme-dim">#{idx + 1} ({em.percentage}%)</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === 'topics' && analytics && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Words */}
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              FREQUENT KEYWORDS
            </h3>
            <div className="flex flex-wrap gap-2">
              {analytics.textAnalytics?.topWords?.slice(0, 40).map((w: any) => (
                <span
                  key={w.word}
                  className="px-2.5 py-1 rounded-lg bg-theme-base border border-theme-border text-xs text-theme-text hover:border-theme-border-hi hover:text-theme-accent transition-colors"
                >
                  {w.word} <strong className="text-theme-accent font-normal">({w.count})</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Top Bigram Phrases */}
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
              RECURRING PHRASES (N-GRAMS)
            </h3>
            <div className="space-y-2">
              {analytics.textAnalytics?.topPhrases?.slice(0, 10).map((p: any) => (
                <div key={p.phrase} className="flex items-center justify-between p-2.5 rounded-lg bg-theme-base border border-theme-border text-xs">
                  <span className="text-theme-text font-medium">{p.phrase}</span>
                  <span className="text-theme-accent font-semibold">{p.count} times</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {subTab === 'links' && analytics && (
        <section className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
          <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider">
            SHARED WEB URLS ({analytics.textAnalytics?.urls?.length || 0})
          </h3>
          <div className="space-y-2">
            {analytics.textAnalytics?.urls?.map((link: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-theme-base border border-theme-border hover:border-theme-border-hi transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate mr-4">
                  <LinkIcon className="w-4 h-4 text-theme-accent shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-theme-text hover:text-theme-accent truncate underline"
                  >
                    {link.url}
                  </a>
                </div>
                <span className="px-2 py-0.5 rounded bg-theme-surface text-[11px] text-theme-dim shrink-0 border border-theme-border">
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

      {/* Legal Bates Stamping & PII Redaction Modal */}
      {isBatesOpen && (
        <BatesStampingModal
          isOpen={isBatesOpen}
          onClose={() => setIsBatesOpen(false)}
          datasetId={activeDataset.id}
          datasetName={activeDataset.name}
        />
      )}
    </div>
  );
}
