'use client';

import React, { useState, useEffect } from 'react';

interface TimelineBucket {
  bucket: string;
  count: number;
}

interface TimelineViewProps {
  datasetId: string;
  apiUrl: string;
  selectedRange: { start: string | null; end: string | null };
  onRangeSelect: (range: { start: string | null; end: string | null }) => void;
  searchQuery?: string;
  activeWord?: string | null;
  activeActor?: string | null;
}

export function TimelineView({
  datasetId,
  apiUrl,
  selectedRange,
  onRangeSelect,
  searchQuery,
  activeWord,
  activeActor,
}: TimelineViewProps) {
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('week');
  const [buckets, setBuckets] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function fetchTimeline() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('interval', interval);
        if (searchQuery) params.set('search', searchQuery);
        if (activeActor) params.set('actor', activeActor);

        const res = await fetch(`${apiUrl}/datasets/${datasetId}/timeline?${params.toString()}`);
        if (res.ok) {
          const data: TimelineBucket[] = await res.json();
          if (!isCancelled) {
            setBuckets(data);
          }
        }
      } catch (err) {
        console.error('Failed to load timeline data', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTimeline();
    return () => {
      isCancelled = true;
    };
  }, [datasetId, apiUrl, interval, searchQuery, activeActor]);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const formatBucketLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (interval === 'month') {
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    if (interval === 'week') {
      return `Wk ${d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`;
    }
    return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  };

  const handleBucketClick = (bucket: TimelineBucket) => {
    const start = new Date(bucket.bucket);
    let end = new Date(start);

    if (interval === 'month') {
      end.setUTCMonth(end.getUTCMonth() + 1);
    } else if (interval === 'week') {
      end.setUTCDate(end.getUTCDate() + 7);
    } else {
      end.setUTCDate(end.getUTCDate() + 1);
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    if (selectedRange.start === startISO && selectedRange.end === endISO) {
      onRangeSelect({ start: null, end: null });
    } else {
      onRangeSelect({ start: startISO, end: endISO });
    }
  };

  const isBucketSelected = (bucketDateStr: string) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    const bDate = new Date(bucketDateStr).getTime();
    const sDate = new Date(selectedRange.start).getTime();
    const eDate = new Date(selectedRange.end).getTime();
    return bDate >= sDate && bDate < eDate;
  };

  return (
    <div className="border border-zinc-700 bg-zinc-900 rounded p-4 mb-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
            Timeline Volume
          </h3>
          {selectedRange.start && (
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded">
              Filter Active: {new Date(selectedRange.start).toLocaleDateString()} –{' '}
              {new Date(selectedRange.end!).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedRange.start && (
            <button
              onClick={() => onRangeSelect({ start: null, end: null })}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700"
            >
              Reset Range
            </button>
          )}

          <div className="flex bg-zinc-800 rounded p-0.5 border border-zinc-700">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInterval(mode)}
                className={`px-2.5 py-1 text-xs rounded capitalize font-medium ${
                  interval === mode
                    ? 'bg-zinc-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && buckets.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-xs text-zinc-500">
          Loading timeline buckets...
        </div>
      ) : buckets.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-xs text-zinc-500">
          No events in selected filter
        </div>
      ) : (
        <div className="h-32 flex items-end gap-1 overflow-x-auto pt-2 pb-1">
          {buckets.map((b) => {
            const heightPercent = Math.max(8, (b.count / maxCount) * 100);
            const selected = isBucketSelected(b.bucket);

            return (
              <button
                key={b.bucket}
                onClick={() => handleBucketClick(b)}
                title={`${new Date(b.bucket).toLocaleDateString()}: ${b.count.toLocaleString()} messages`}
                className={`flex-1 min-w-[14px] max-w-[40px] flex flex-col items-center justify-end group transition-colors`}
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all ${
                    selected
                      ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                      : 'bg-zinc-600 group-hover:bg-zinc-400'
                  }`}
                />
                <span className="text-[10px] text-zinc-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                  {formatBucketLabel(b.bucket)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
