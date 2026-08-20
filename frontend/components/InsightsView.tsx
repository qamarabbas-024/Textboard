import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  RefreshCwIcon,
  TerminalIcon,
  ActivityIcon,
  CheckCircleIcon,
  DatabaseIcon,
} from './Icons';

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
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-100 text-xs tracking-wider uppercase">
              DETERMINISTIC INTELLIGENCE WALL
            </h2>
            <p className="text-[11px] text-neutral-400">
              Verifiable statistical insights with zero hallucination risk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {datasets.length > 0 && (
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="bg-[#151b26] border border-white/[0.12] rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500/50"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchInsights(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 text-xs transition-colors border border-white/[0.08]"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recompute</span>
          </button>
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md tracking-wider transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                  : 'bg-white/[0.03] text-neutral-400 hover:text-neutral-200 border border-white/[0.05]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Insights Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.length === 0 ? (
          <div className="col-span-2 p-12 rounded-xl border border-white/[0.06] bg-[#10141d]/40 text-center text-xs text-neutral-500">
            No insights found for the selected category.
          </div>
        ) : (
          filteredInsights.map((ins) => {
            const isExpanded = expandedInsightId === ins.id;
            return (
              <div
                key={ins.id}
                className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                      {ins.category}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {Math.round(ins.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>

                  <h3 className="font-bold text-neutral-100 text-sm mb-2">{ins.title}</h3>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">{ins.summary}</p>
                </div>

                {/* Traceable Supporting Data Inspector */}
                <div className="pt-3 border-t border-white/[0.05]">
                  <button
                    onClick={() => setExpandedInsightId(isExpanded ? null : ins.id)}
                    className="w-full flex items-center justify-between text-[11px] text-neutral-400 hover:text-cyan-300 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isExpanded ? 'Hide Traceable Data' : 'Inspect Supporting Data'}</span>
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      {isExpanded ? '▲ COLLAPSE' : '▼ AUDIT'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded bg-black/50 border border-white/[0.08] text-[11px] text-cyan-300 overflow-x-auto">
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
