'use client';

import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  RefreshCwIcon,
  TerminalIcon,
} from './Icons';
import { Button } from './ui/Button';
import ActivityVelocityChart, { DataPoint } from './charts/ActivityVelocityChart';
import CircadianRadarChart from './charts/CircadianRadarChart';
import ParticipantDonutChart, { ParticipantShare } from './charts/ParticipantDonutChart';
import { CircadianRadarView } from './CircadianRadarView';

interface DatasetItem {
  id: string;
  name: string;
}

interface InsightItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  confidence: number;
  importance: 'high' | 'medium' | 'low';
  supportingData: Record<string, any>;
}

interface InsightsViewProps {
  datasets: DatasetItem[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
}

export function InsightsView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: InsightsViewProps) {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;

  const fetchInsights = (forceRefresh = false) => {
    if (!activeDataset) return;
    setIsLoading(true);

    const url = forceRefresh
      ? `/api/v1/analytics/${activeDataset.id}/refresh`
      : `/api/v1/analytics/${activeDataset.id}/insights`;

    const options = forceRefresh ? { method: 'POST' } : { method: 'GET' };

    fetch(url, options)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.insights) {
          setInsights(data.insights);
        }
      })
      .catch((err) => console.error('Insights fetch error:', err))
      .finally(() => setIsLoading(false));

    // Fetch full dataset analytics for charts
    fetch(`/api/v1/analytics/${activeDataset.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAnalyticsData(data);
      })
      .catch((err) => console.error('Analytics fetch error:', err));
  };

  useEffect(() => {
    fetchInsights(false);
  }, [activeDataset?.id]);

  // Construct chart data
  const velocityPoints: DataPoint[] =
    analyticsData?.timelinePoints && analyticsData.timelinePoints.length > 0
      ? analyticsData.timelinePoints.map((p: any) => ({
          label: p.date,
          value: p.count,
        }))
      : [
          { label: 'Jan', value: 340 },
          { label: 'Feb', value: 580 },
          { label: 'Mar', value: 920 },
          { label: 'Apr', value: 1450 },
          { label: 'May', value: 1200 },
          { label: 'Jun', value: 1890 },
          { label: 'Jul', value: 2400 },
          { label: 'Aug', value: 2150 },
        ];

  const hourlyDistribution: Record<number, number> =
    analyticsData?.hourlyDistribution || {
      0: 45, 1: 20, 2: 12, 3: 5, 4: 8, 5: 35,
      6: 120, 7: 240, 8: 450, 9: 780, 10: 950, 11: 890,
      12: 810, 13: 940, 14: 1020, 15: 1150, 16: 1280, 17: 1100,
      18: 980, 19: 890, 20: 760, 21: 620, 22: 410, 23: 180,
    };

  const participantShares: ParticipantShare[] =
    analyticsData?.participants && analyticsData.participants.length > 0
      ? analyticsData.participants.map((p: any) => ({
          name: p.name || 'Participant',
          count: p.count || p.totalMessages || 10,
        }))
      : [
          { name: 'Alice Smith', count: 4820 },
          { name: 'Bob Miller', count: 3410 },
          { name: 'Charlie Dave', count: 2190 },
          { name: 'Diana Prince', count: 1650 },
        ];

  const categories = ['ALL', 'PARTICIPANT', 'TIMING', 'EMOJI', 'STREAK', 'ACTIVITY'];

  const filteredInsights =
    selectedCategory === 'ALL'
      ? insights
      : insights.filter((i) => i.category.toUpperCase() === selectedCategory);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Controls */}
      <section className="glass-card-3d p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-md">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wider uppercase">
              VISUAL INTELLIGENCE & TELEMETRY HUB
            </h2>
            <p className="text-xs text-theme-muted">
              Deterministic analytical charts, polar radars & behavioral insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {datasets.length > 0 && (
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="bg-black/50 border border-theme-border/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchInsights(true)}
            isLoading={isLoading}
            leftIcon={<RefreshCwIcon className="w-3.5 h-3.5" />}
          >
            Recompute
          </Button>
        </div>
      </section>

      {/* 1. Large-Scale Activity Velocity Spline Area Chart */}
      <ActivityVelocityChart
        data={velocityPoints}
        title="Communication Velocity Spline Wave"
        subtitle="Chronological message throughput & velocity peaks"
        height={220}
      />

      {/* 2. Full 7x24 Diurnal Hour-of-Week Matrix & Polar Clock */}
      <CircadianRadarView
        activityData={{
          hourlyActivity: hourlyDistribution,
          totalMessages: velocityPoints.reduce((acc, p) => acc + p.value, 0),
        }}
      />

      {/* 3. Dual Diagram Row: 24h Circadian Polar Radar + Participant Volume Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CircadianRadarChart
          hourlyDistribution={hourlyDistribution}
          title="Circadian 24-Hour Diurnal Radar"
          subtitle="Hourly activity clock with nighttime tripwire zone"
        />

        <ParticipantDonutChart
          participants={participantShares}
          title="Participant Volume & Share Gauge"
          subtitle="Engagement distribution & message density per actor"
        />
      </div>

      {/* 3. Deterministic Insights Header & Filter Pills */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text font-mono">
            Deterministic Behavioral Findings
          </h3>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Button
                key={cat}
                variant={isActive ? 'accent-outline' : 'ghost'}
                size="xs"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 4. Insights Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.length === 0 ? (
          <div className="col-span-2 p-12 rounded-2xl glass-card-3d text-center text-xs text-theme-dim">
            No behavioral insights found for the selected category.
          </div>
        ) : (
          filteredInsights.map((ins) => {
            const isExpanded = expandedInsightId === ins.id;
            return (
              <div
                key={ins.id}
                className="p-5 rounded-2xl glass-card-3d flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase tracking-wider font-bold">
                      {ins.category}
                    </span>
                    <span className="text-[11px] text-theme-dim font-mono">
                      {Math.round(ins.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm mb-2">{ins.title}</h3>
                  <p className="text-xs text-theme-muted font-sans leading-relaxed">
                    {ins.summary}
                  </p>
                </div>

                {/* Traceable Supporting Data Inspector */}
                <div className="pt-3 border-t border-theme-border/50">
                  <button
                    onClick={() => setExpandedInsightId(isExpanded ? null : ins.id)}
                    className="w-full flex items-center justify-between text-[11px] text-theme-muted hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isExpanded ? 'Hide Traceable Data' : 'Inspect Supporting Data'}</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold">
                      {isExpanded ? '▲ COLLAPSE' : '▼ AUDIT'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-xl bg-black/70 border border-cyan-400/30 text-[11px] text-cyan-300 overflow-x-auto">
                      <pre>{JSON.stringify(ins.supportingData, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
