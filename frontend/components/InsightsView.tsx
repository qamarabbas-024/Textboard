import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  RefreshCwIcon,
  TerminalIcon,
  ActivityIcon,
  CheckCircleIcon,
  DatabaseIcon,
} from './Icons';
import { Button } from './ui/Button';

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
  };

  useEffect(() => {
    fetchInsights(false);
  }, [activeDataset?.id]);

  const categories = ['ALL', 'PARTICIPANT', 'TIMING', 'EMOJI', 'STREAK', 'ACTIVITY'];

  const filteredInsights =
    selectedCategory === 'ALL'
      ? insights
      : insights.filter((i) => i.category.toUpperCase() === selectedCategory);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Controls */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-theme-active border border-theme-border-hi flex items-center justify-center text-theme-accent">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-theme-text text-xs tracking-wider uppercase">
              DETERMINISTIC INTELLIGENCE WALL
            </h2>
            <p className="text-[11px] text-theme-muted">
              Verifiable statistical insights with zero hallucination risk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {datasets.length > 0 && (
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="bg-theme-base border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
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

      {/* Category Filter Pills */}
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

      {/* Insights Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.length === 0 ? (
          <div className="col-span-2 p-12 rounded-xl border border-theme-border bg-theme-surface/50 text-center text-xs text-theme-dim shadow-xs">
            No insights found for the selected category.
          </div>
        ) : (
          filteredInsights.map((ins) => {
            const isExpanded = expandedInsightId === ins.id;
            return (
              <div
                key={ins.id}
                className="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-theme-active text-theme-accent border border-theme-border-hi uppercase tracking-wider font-bold">
                      {ins.category}
                    </span>
                    <span className="text-[11px] text-theme-dim font-mono">
                      {Math.round(ins.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>

                  <h3 className="font-bold text-theme-text text-sm mb-2">{ins.title}</h3>
                  <p className="text-xs text-theme-muted font-sans leading-relaxed">{ins.summary}</p>
                </div>

                {/* Traceable Supporting Data Inspector */}
                <div className="pt-3 border-t border-theme-border">
                  <button
                    onClick={() => setExpandedInsightId(isExpanded ? null : ins.id)}
                    className="w-full flex items-center justify-between text-[11px] text-theme-muted hover:text-theme-accent transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-theme-accent" />
                      <span>{isExpanded ? 'Hide Traceable Data' : 'Inspect Supporting Data'}</span>
                    </span>
                    <span className="text-[10px] text-theme-accent font-bold">
                      {isExpanded ? '▲ COLLAPSE' : '▼ AUDIT'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-theme-base border border-theme-border text-[11px] text-theme-accent overflow-x-auto">
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
