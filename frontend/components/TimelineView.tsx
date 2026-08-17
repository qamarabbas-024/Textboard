'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [hoveredBucket, setHoveredBucket] = useState<TimelineBucket | null>(null);

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

  // Generate SVG path for the smooth drawn line
  const svgLinePath = useMemo(() => {
    if (buckets.length < 2) return '';
    const width = 1000;
    const height = 120;
    const padding = 20;

    const points = buckets.map((b, i) => {
      const x = (i / (buckets.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - (b.count / maxCount) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }, [buckets, maxCount]);

  return (
    <div className="border border-theme-border bg-theme-surface rounded-theme p-4 mb-4 terminal-interactive shadow-sm transition-all relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-theme-accent inline-block animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Timeline Trend
            </h3>
          </div>

          {selectedRange.start && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[11px] bg-theme-raised text-theme-accent border border-theme-border px-2 py-0.5 rounded-theme font-medium"
            >
              Filter Active: {new Date(selectedRange.start).toLocaleDateString()} –{' '}
              {new Date(selectedRange.end!).toLocaleDateString()}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedRange.start && (
            <button
              onClick={() => onRangeSelect({ start: null, end: null })}
              className="text-xs bg-theme-raised hover:bg-theme-active text-theme-muted hover:text-theme-text px-2.5 py-1 rounded-theme border border-theme-border transition-colors"
            >
              Reset Range
            </button>
          )}

          <div className="flex bg-theme-raised rounded-theme p-0.5 border border-theme-border">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInterval(mode)}
                className={`px-2.5 py-1 text-xs rounded-theme capitalize font-medium transition-all ${
                  interval === mode
                    ? 'bg-theme-surface text-theme-accent shadow-sm border border-theme-border'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && buckets.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs text-theme-muted">
          Loading timeline buckets...
        </div>
      ) : buckets.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs text-theme-muted">
          No events in selected filter
        </div>
      ) : (
        <div className="relative h-36 flex flex-col justify-end pt-2">
          {/* Animated SVG trendline */}
          {svgLinePath && (
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="w-full h-full">
                <motion.path
                  d={svgLinePath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
              </svg>
            </div>
          )}

          {/* Interactive bars */}
          <div className="flex items-end gap-1 overflow-x-auto h-full pb-1 z-10">
            {buckets.map((b, idx) => {
              const heightPercent = Math.max(8, (b.count / maxCount) * 100);
              const selected = isBucketSelected(b.bucket);

              return (
                <button
                  key={b.bucket}
                  onClick={() => handleBucketClick(b)}
                  onMouseEnter={() => setHoveredBucket(b)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  title={`${new Date(b.bucket).toLocaleDateString()}: ${b.count.toLocaleString()} messages`}
                  className="flex-1 min-w-[14px] max-w-[44px] flex flex-col items-center justify-end group transition-all relative"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min(idx * 0.015, 0.4),
                      ease: 'easeOut',
                    }}
                    className={`w-full rounded-t-sm transition-all ${
                      selected
                        ? 'bg-theme-accent shadow-theme-glow border-t-2 border-theme-border-hi'
                        : 'bg-theme-raised group-hover:bg-theme-active border border-theme-border/40 group-hover:border-theme-border-hi/60'
                    }`}
                  />
                  <span className="text-[10px] text-theme-dim mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center group-hover:text-theme-muted">
                    {formatBucketLabel(b.bucket)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hover readout */}
          {hoveredBucket && (
            <div className="absolute top-1 right-2 text-[11px] font-mono text-theme-accent bg-theme-base border border-theme-border px-2 py-0.5 rounded-theme shadow-md">
              {new Date(hoveredBucket.bucket).toLocaleDateString()}:{' '}
              {hoveredBucket.count.toLocaleString()} msgs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
