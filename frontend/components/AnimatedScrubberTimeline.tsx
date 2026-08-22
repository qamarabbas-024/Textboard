'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';

export interface TimelineBucket {
  bucket: string;
  count: number;
}

interface AnimatedScrubberTimelineProps {
  datasetId: string;
  apiUrl?: string;
  selectedRange?: { start: string | null; end: string | null };
  onRangeSelect?: (range: { start: string | null; end: string | null }) => void;
  onDateScrub?: (isoDate: string) => void;
  searchQuery?: string;
  activeActor?: string | null;
}

export function AnimatedScrubberTimeline({
  datasetId,
  apiUrl = '',
  selectedRange = { start: null, end: null },
  onRangeSelect,
  onDateScrub,
  searchQuery,
  activeActor,
}: AnimatedScrubberTimelineProps) {
  const [interval, setInterval] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [buckets, setBuckets] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState<TimelineBucket | null>(null);
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<any>(null);

  // Fetch timeline buckets
  useEffect(() => {
    let isCancelled = false;
    async function fetchTimeline() {
      if (!datasetId) return;
      setLoading(true);
      try {
        const base = apiUrl || '';
        const params = new URLSearchParams();
        params.set('interval', interval === 'year' ? 'month' : interval);
        if (searchQuery) params.set('search', searchQuery);
        if (activeActor) params.set('actor', activeActor);

        const res = await fetch(`${base}/api/v1/datasets/${datasetId}/timeline?${params.toString()}`);
        if (res.ok) {
          let data: TimelineBucket[] = await res.json();

          // Aggregate into years if interval is year
          if (interval === 'year' && data.length > 0) {
            const yearMap = new Map<string, number>();
            for (const b of data) {
              const y = b.bucket.substring(0, 4) + '-01-01T00:00:00.000Z';
              yearMap.set(y, (yearMap.get(y) || 0) + b.count);
            }
            data = Array.from(yearMap.entries()).map(([bucket, count]) => ({ bucket, count }));
          }

          if (!isCancelled) {
            setBuckets(data);
            if (data.length > 0) {
              setScrubberIndex((prev) => Math.min(prev, data.length - 1));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load animated timeline data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTimeline();
    return () => {
      isCancelled = true;
    };
  }, [datasetId, apiUrl, interval, searchQuery, activeActor]);

  const maxCount = useMemo(() => Math.max(1, ...buckets.map((b) => b.count)), [buckets]);
  const totalVolume = useMemo(() => buckets.reduce((acc, b) => acc + b.count, 0), [buckets]);

  // Find peak day
  const peakBucket = useMemo(() => {
    if (buckets.length === 0) return null;
    return buckets.reduce((max, b) => (b.count > max.count ? b : max), buckets[0]);
  }, [buckets]);

  // Scrub handler
  const handleScrub = useCallback(
    (index: number) => {
      if (index < 0 || index >= buckets.length) return;
      setScrubberIndex(index);
      const target = buckets[index];
      if (target && onDateScrub) {
        onDateScrub(target.bucket);
      }
    },
    [buckets, onDateScrub],
  );

  // Auto-play / playback mode
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.max(80, Math.floor(400 / playbackSpeed));
    playTimerRef.current = window.setInterval(() => {
      setScrubberIndex((prev) => {
        const next = prev + 1;
        if (next >= buckets.length) {
          setIsPlaying(false);
          return prev;
        }
        if (buckets[next] && onDateScrub) {
          onDateScrub(buckets[next].bucket);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, buckets, onDateScrub]);

  // Track click to scrub
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || buckets.length === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIdx = Math.round(percentage * (buckets.length - 1));
    handleScrub(targetIdx);
  };

  const handleBucketClick = (bucket: TimelineBucket, idx: number) => {
    handleScrub(idx);

    if (!onRangeSelect) return;
    const start = new Date(bucket.bucket);
    const end = new Date(start);

    if (interval === 'year') {
      end.setUTCFullYear(end.getUTCFullYear() + 1);
    } else if (interval === 'month') {
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

  const currentScrubbedDate = buckets[scrubberIndex]?.bucket
    ? new Date(buckets[scrubberIndex].bucket).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Select timestamp';

  const scrubberPercentage =
    buckets.length > 1 ? (scrubberIndex / (buckets.length - 1)) * 100 : 0;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0c1018]/95 p-4 space-y-4 font-mono shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* 1. Header Toolbar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)] animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-100">
                ANIMATED TIMELINE SCRUBBER
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold">
                V1.3
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Total Stream Volume: <strong className="text-neutral-200"><AnimatedCounter value={totalVolume} /></strong> records across {buckets.length} intervals
            </span>
          </div>
        </div>

        {/* Scrubber Playback & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Play/Pause Scrub Simulation */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1.5 ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
              }`}
              title={isPlaying ? 'Pause timeline playback' : 'Play / Auto-scrub through timeline'}
            >
              <span>{isPlaying ? '⏸' : '▶'}</span>
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 text-[10px]">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded ${
                    playbackSpeed === speed
                      ? 'bg-white/[0.15] text-cyan-300 font-bold'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick Jump Shortcuts */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScrub(0)}
              className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-neutral-400 hover:text-neutral-200 border border-white/[0.06]"
              title="Jump to Start"
            >
              ⏮ Start
            </button>
            {peakBucket && (
              <button
                onClick={() => {
                  const idx = buckets.findIndex((b) => b.bucket === peakBucket.bucket);
                  if (idx !== -1) handleScrub(idx);
                }}
                className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-[11px] text-purple-300 border border-purple-500/30"
                title={`Jump to Peak Day (${peakBucket.count} msgs)`}
              >
                ⚡ Peak ({peakBucket.count})
              </button>
            )}
            <button
              onClick={() => handleScrub(buckets.length - 1)}
              className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-neutral-400 hover:text-neutral-200 border border-white/[0.06]"
              title="Jump to Present / End"
            >
              End ⏭
            </button>
          </div>

          {/* Zoom Level Interval Switcher */}
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/[0.08] text-xs">
            {(['day', 'week', 'month', 'year'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInterval(mode)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                  interval === mode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {selectedRange.start && onRangeSelect && (
            <button
              onClick={() => onRangeSelect({ start: null, end: null })}
              className="px-2.5 py-1 text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Histogram & Minimap Bars */}
      <div className="relative">
        {loading && buckets.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-neutral-500 gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Computing animated timeline distribution...</span>
          </div>
        ) : buckets.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-neutral-500">
            No events found matching current criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Density Bars Canvas */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              className="relative h-28 flex items-end gap-[2px] pt-4 cursor-pointer select-none bg-black/30 rounded-lg p-2 border border-white/[0.04]"
            >
              {buckets.map((b, idx) => {
                const heightPercent = Math.max(10, (b.count / maxCount) * 100);
                const isCurrent = scrubberIndex === idx;
                const isPeak = peakBucket?.bucket === b.bucket;

                return (
                  <div
                    key={b.bucket}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBucketClick(b, idx);
                    }}
                    onMouseEnter={() => setHoveredBucket(b)}
                    onMouseLeave={() => setHoveredBucket(null)}
                    className="flex-1 min-w-[3px] max-w-[32px] h-full flex flex-col justify-end items-center group relative"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{
                        duration: 0.4,
                        delay: Math.min(idx * 0.008, 0.3),
                        ease: 'easeOut',
                      }}
                      className={`w-full rounded-t-[2px] transition-colors duration-150 ${
                        isCurrent
                          ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] border-t-2 border-white'
                          : isPeak
                          ? 'bg-purple-400/80 group-hover:bg-purple-300'
                          : 'bg-white/[0.12] group-hover:bg-cyan-500/60'
                      }`}
                    />
                  </div>
                );
              })}

              {/* Animated Scrubber Cursor Line */}
              <motion.div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none shadow-[0_0_10px_#22d3ee] z-20"
                style={{ left: `${scrubberPercentage}%` }}
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-neutral-900 shadow-md" />
              </motion.div>
            </div>

            {/* Scrubber Readout Badge & Drag Bar */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  Scrubbing Position:
                </span>
                <span className="px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                  {currentScrubbedDate}
                </span>
                {buckets[scrubberIndex] && (
                  <span className="text-[11px] text-neutral-400">
                    (<strong className="text-cyan-300">{buckets[scrubberIndex].count.toLocaleString()}</strong> messages)
                  </span>
                )}
              </div>

              {/* Interactive Range Scrubber Slider */}
              <div className="flex-1 max-w-md hidden md:flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, buckets.length - 1)}
                  value={scrubberIndex}
                  onChange={(e) => handleScrub(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-white/[0.1] h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-neutral-500 whitespace-nowrap font-mono">
                  {Math.round(scrubberPercentage)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover Readout Tooltip */}
      <AnimatePresence>
        {hoveredBucket && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-4 px-3 py-1.5 rounded bg-[#151b26] border border-cyan-500/40 text-xs text-neutral-200 shadow-lg pointer-events-none z-30"
          >
            <div className="text-cyan-300 font-bold">
              {new Date(hoveredBucket.bucket).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-[11px] text-neutral-400">
              Volume: <strong className="text-neutral-100">{hoveredBucket.count.toLocaleString()}</strong> records
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
