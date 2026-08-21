import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  FilterIcon,
  ClockIcon,
  UsersIcon,
  RefreshCwIcon,
  LinkIcon,
  SmileIcon,
  SparklesIcon,
} from './Icons';

interface DatasetItem {
  id: string;
  name: string;
  totalEvents: number;
}

interface SearchViewProps {
  datasets: DatasetItem[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
}

export function SearchView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [datasetFilter, setDatasetFilter] = useState<string>(selectedDatasetId || '');
  const [searchMode, setSearchMode] = useState<'hybrid' | 'semantic' | 'exact'>('hybrid');
  const [results, setResults] = useState<any[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  useEffect(() => {
    if (selectedDatasetId) {
      setDatasetFilter(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const executeSearch = async (targetPage = 1) => {
    setIsLoading(true);
    try {
      const url = new URL('/api/v1/search', window.location.origin);
      if (query.trim()) url.searchParams.set('q', query.trim());
      if (datasetFilter) url.searchParams.set('datasetId', datasetFilter);
      url.searchParams.set('mode', searchMode);
      url.searchParams.set('page', String(targetPage));
      url.searchParams.set('limit', '25');

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
        setTotalMatches(data.totalMatches || 0);
        setHasMore(data.hasMore || false);
        setExecutionTimeMs(data.executionTimeMs || null);
        setPage(targetPage);
      }
    } catch (err) {
      console.error('Search query error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch(1);
    }
  };

  const insertToken = (token: string) => {
    setQuery((prev) => (prev ? `${prev} ${token}` : token));
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Search Input Bar */}
      <section className="p-6 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder='Search messages... e.g. "budget" person:Ali after:2025-01-01 emoji:🎉 has:urls'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#151b26] border border-white/[0.12] rounded-lg pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/60 transition-colors shadow-inner"
            />
          </div>

          <select
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#151b26] border border-white/[0.12] rounded-lg px-3 py-2.5 text-xs text-neutral-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">ALL DATASETS</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => executeSearch(1)}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
          >
            {isLoading ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
            <span>SEARCH</span>
          </button>
        </div>

        {/* Search Mode Switches */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 text-[11px] mr-1">ENGINE:</span>
            <button
              onClick={() => setSearchMode('hybrid')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                searchMode === 'hybrid'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06] hover:text-neutral-200'
              }`}
            >
              <span>⚡</span>
              <span>HYBRID</span>
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                searchMode === 'semantic'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06] hover:text-neutral-200'
              }`}
            >
              <span>🧠</span>
              <span>SEMANTIC VECTOR AI</span>
            </button>
            <button
              onClick={() => setSearchMode('exact')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                searchMode === 'exact'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06] hover:text-neutral-200'
              }`}
            >
              <span>🔍</span>
              <span>EXACT KEYWORDS</span>
            </button>
          </div>

          {/* Quick Syntax Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-neutral-500 flex items-center gap-1">
              <FilterIcon className="w-3 h-3" /> SYNTAX:
            </span>
            <button
              onClick={() => insertToken('person:Ali')}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06] transition-colors"
            >
              person:Name
            </button>
            <button
              onClick={() => insertToken('after:2024-01-01')}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06] transition-colors"
            >
              after:YYYY-MM-DD
            </button>
            <button
              onClick={() => insertToken('emoji:😂')}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06] transition-colors"
            >
              emoji:Emoji
            </button>
          </div>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex items-center justify-between px-2 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span>
            MATCHES FOUND: <strong className="text-neutral-100">{totalMatches.toLocaleString()}</strong>
          </span>
          {executionTimeMs !== null && (
            <span className="text-[11px] text-cyan-400 font-bold">
              ⚡ {executionTimeMs}ms query latency
            </span>
          )}
        </div>
        {results.length > 0 && (
          <span>
            PAGE <strong className="text-cyan-400">{page}</strong> (Showing {results.length} records)
          </span>
        )}
      </div>

      {/* Results List */}
      <section className="space-y-3">
        {results.length === 0 && !isLoading ? (
          <div className="p-12 rounded-xl border border-white/[0.06] bg-[#10141d]/40 text-center text-xs text-neutral-500">
            No search matches found. Try refining your keywords or filters.
          </div>
        ) : (
          results.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/30 transition-all space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20">
                    {item.actor || 'System'}
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  {item.semanticScore !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3 text-purple-400" />
                      {Math.round(item.semanticScore * 100)}% Concept Match
                    </span>
                  )}
                  {item.hasUrls && (
                    <span className="flex items-center gap-1 text-cyan-400">
                      <LinkIcon className="w-3 h-3" /> Link
                    </span>
                  )}
                  {item.hasEmojis && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <SmileIcon className="w-3 h-3" /> Emoji
                    </span>
                  )}
                  {item.score && (
                    <span className="text-neutral-500">
                      Rank: {item.score}
                    </span>
                  )}
                </div>
              </div>

              {/* Highlighted snippet */}
              <div
                className="text-xs text-neutral-200 font-sans leading-relaxed pt-1"
                dangerouslySetInnerHTML={{
                  __html: item.highlight || item.content,
                }}
              />
            </div>
          ))
        )}
      </section>

      {/* Pagination Bar */}
      {results.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs">
          <button
            onClick={() => executeSearch(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
            className="px-4 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 disabled:opacity-30 disabled:hover:bg-white/[0.04] transition-colors"
          >
            ← Previous Page
          </button>
          <span className="text-neutral-500">Page {page}</span>
          <button
            onClick={() => executeSearch(page + 1)}
            disabled={!hasMore || isLoading}
            className="px-4 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 disabled:opacity-30 disabled:hover:bg-white/[0.04] transition-colors"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
}
