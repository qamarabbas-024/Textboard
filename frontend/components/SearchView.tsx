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
import { Button } from './ui/Button';

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

  const exportCsv = () => {
    if (results.length === 0) return;
    const headers = ['Timestamp', 'Actor', 'Content', 'Sentiment', 'Source'];
    const rows = results.map((r) => [
      `"${r.timestamp}"`,
      `"${(r.actor || 'System').replace(/"/g, '""')}"`,
      `"${(r.content || '').replace(/"/g, '""')}"`,
      `"${r.sentiment || 'NEUTRAL'}"`,
      `"${r.sourceType || 'ARCHIVE'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `textboard_search_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Search Input Bar */}
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-dim" />
            <input
              type="text"
              placeholder='Search messages... e.g. "budget" AND person:Ali NOT draft'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-theme-base border border-theme-border rounded-lg pl-10 pr-4 py-2.5 text-xs text-theme-text placeholder:text-theme-dim focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors shadow-inner"
            />
          </div>

          <select
            value={datasetFilter}
            onChange={(e) => {
              setDatasetFilter(e.target.value);
              onSelectDataset(e.target.value);
            }}
            className="w-full sm:w-56 bg-theme-base border border-theme-border rounded-lg px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent"
          >
            <option value="">All Streams</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.totalEvents.toLocaleString()} records)
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            onClick={() => executeSearch(1)}
            isLoading={isLoading}
            leftIcon={<SearchIcon className="w-4 h-4" />}
          >
            SEARCH
          </Button>
        </div>

        {/* Search Mode Switches */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-theme-border text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-theme-dim text-[11px] mr-1">ENGINE:</span>
            <Button
              variant={searchMode === 'hybrid' ? 'accent-outline' : 'ghost'}
              size="xs"
              onClick={() => setSearchMode('hybrid')}
            >
              ⚡ HYBRID
            </Button>
            <Button
              variant={searchMode === 'semantic' ? 'accent-outline' : 'ghost'}
              size="xs"
              onClick={() => setSearchMode('semantic')}
            >
              🧠 SEMANTIC VECTOR AI
            </Button>
            <Button
              variant={searchMode === 'exact' ? 'accent-outline' : 'ghost'}
              size="xs"
              onClick={() => setSearchMode('exact')}
            >
              🔍 EXACT KEYWORDS
            </Button>
          </div>

          {/* Quick Syntax Chips & Boolean Operators */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-theme-dim flex items-center gap-1">
              <FilterIcon className="w-3 h-3" /> SYNTAX:
            </span>
            <button
              onClick={() => insertToken('AND')}
              className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer"
            >
              AND
            </button>
            <button
              onClick={() => insertToken('OR')}
              className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold cursor-pointer"
            >
              OR
            </button>
            <button
              onClick={() => insertToken('NOT')}
              className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
            >
              NOT
            </button>
            <button
              onClick={() => insertToken('person:Ali')}
              className="px-2 py-0.5 rounded bg-theme-base hover:bg-theme-raised text-theme-muted hover:text-theme-text border border-theme-border transition-colors cursor-pointer"
            >
              person:Name
            </button>
            <button
              onClick={() => insertToken('after:2024-01-01')}
              className="px-2 py-0.5 rounded bg-theme-base hover:bg-theme-raised text-theme-muted hover:text-theme-text border border-theme-border transition-colors cursor-pointer"
            >
              after:YYYY-MM-DD
            </button>
          </div>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex items-center justify-between px-2 text-xs text-theme-muted">
        <div className="flex items-center gap-3">
          <span>
            MATCHES FOUND: <strong className="text-theme-text">{totalMatches.toLocaleString()}</strong>
          </span>
          {executionTimeMs !== null && (
            <span className="text-[11px] text-theme-accent font-bold">
              ⚡ {executionTimeMs}ms query latency
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <button
              onClick={exportCsv}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              📥 EXPORT CSV
            </button>
          )}
          {results.length > 0 && (
            <span>
              PAGE <strong className="text-theme-accent">{page}</strong> (Showing {results.length} records)
            </span>
          )}
        </div>
      </div>

      {/* Results List */}
      <section className="space-y-3">
        {results.length === 0 && !isLoading ? (
          <div className="p-12 rounded-xl border border-theme-border bg-theme-surface/50 text-center text-xs text-theme-dim">
            No search matches found. Try refining your keywords or filters.
          </div>
        ) : (
          results.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-theme-active text-theme-accent font-semibold border border-theme-border-hi">
                    {item.actor || 'System'}
                  </span>
                  <span className="text-theme-dim text-[11px]">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-theme-muted">
                  {item.semanticScore !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3 text-purple-400" />
                      {Math.round(item.semanticScore * 100)}% Concept Match
                    </span>
                  )}
                  {item.hasUrls && (
                    <span className="flex items-center gap-1 text-theme-accent font-semibold">
                      <LinkIcon className="w-3 h-3" /> Link
                    </span>
                  )}
                  {item.hasEmojis && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <SmileIcon className="w-3 h-3" /> Emoji
                    </span>
                  )}
                  {item.score && (
                    <span className="text-theme-dim">
                      Rank: {item.score}
                    </span>
                  )}
                </div>
              </div>

              {/* Highlighted snippet */}
              <div
                className="text-xs text-theme-text font-sans leading-relaxed pt-1"
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
        <div className="flex items-center justify-between pt-4 border-t border-theme-border text-xs">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => executeSearch(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
          >
            ← Previous Page
          </Button>
          <span className="text-theme-dim font-bold">Page {page}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => executeSearch(page + 1)}
            disabled={!hasMore || isLoading}
          >
            Next Page →
          </Button>
        </div>
      )}
    </div>
  );
}
