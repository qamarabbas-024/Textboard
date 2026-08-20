'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatedCounter } from './AnimatedCounter';

export interface TimelineEventItem {
  id: string;
  datasetId: string;
  timestamp: string;
  actor: string | null;
  content: string;
  eventType: string;
  metadata?: any;
}

interface ChatViewProps {
  datasetId: string;
  apiUrl?: string;
  selectedRange?: { start: string | null; end: string | null };
  searchQuery?: string;
  activeWord?: string | null;
  activeActor?: string | null;
  onSelectActor?: (actor: string | null) => void;
  onTotalCountChange?: (count: number) => void;
}

const AUTHOR_PALETTE = [
  'border-emerald-600/70 text-emerald-400 bg-emerald-950/40',
  'border-cyan-600/70 text-cyan-400 bg-cyan-950/40',
  'border-purple-600/70 text-purple-400 bg-purple-950/40',
  'border-amber-600/70 text-amber-400 bg-amber-950/40',
  'border-rose-600/70 text-rose-400 bg-rose-950/40',
  'border-blue-600/70 text-blue-400 bg-blue-950/40',
  'border-fuchsia-600/70 text-fuchsia-400 bg-fuchsia-950/40',
  'border-teal-600/70 text-teal-400 bg-teal-950/40',
];

function getActorStyle(actor: string | null) {
  if (!actor) return 'border-theme-border text-theme-muted bg-theme-raised';
  let hash = 0;
  for (let i = 0; i < actor.length; i++) {
    hash = (hash << 5) - hash + actor.charCodeAt(i);
    hash |= 0;
  }
  return AUTHOR_PALETTE[Math.abs(hash) % AUTHOR_PALETTE.length];
}

export function ChatView({
  datasetId,
  apiUrl = '',
  selectedRange = { start: null, end: null },
  searchQuery,
  activeWord,
  activeActor,
  onSelectActor,
  onTotalCountChange,
}: ChatViewProps) {
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalMatching, setTotalMatching] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const parentRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (cursor?: string, append = false) => {
      if (!datasetId) return;
      setIsLoading(true);

      try {
        const url = new URL(`${apiUrl}/api/v1/datasets/${datasetId}/events`, window.location.origin);
        url.searchParams.set('limit', '50');
        if (cursor) url.searchParams.set('cursor', cursor);
        if (selectedRange.start) url.searchParams.set('startDate', selectedRange.start);
        if (selectedRange.end) url.searchParams.set('endDate', selectedRange.end);
        if (searchQuery) url.searchParams.set('search', searchQuery);
        if (activeWord) url.searchParams.set('word', activeWord);
        if (activeActor) url.searchParams.set('actor', activeActor);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch events');

        const data = await res.json();
        setTotalMatching(data.totalMatching);
        if (onTotalCountChange) onTotalCountChange(data.totalMatching);

        setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
        setNextCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        console.error('ChatView fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [datasetId, apiUrl, selectedRange, searchQuery, activeWord, activeActor, onTotalCountChange],
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= events.length - 1 && hasMore && !isLoading && nextCursor) {
      fetchPage(nextCursor, true);
    }
  }, [virtualItems, events.length, hasMore, isLoading, nextCursor, fetchPage]);

  return (
    <div className="flex flex-col h-[650px] w-full bg-theme-surface border border-theme-border rounded-theme overflow-hidden font-mono text-xs shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-theme-raised border-b border-theme-border text-theme-muted select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-theme-text uppercase tracking-wider">EVENT FEED</span>
          <span className="text-theme-dim">({datasetId.slice(0, 8)}...)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {activeActor && (
            <div className="flex items-center gap-1 bg-theme-active border border-theme-border px-2 py-0.5 rounded text-theme-text">
              <span>Actor: {activeActor}</span>
              {onSelectActor && (
                <button
                  onClick={() => onSelectActor(null)}
                  className="hover:text-rose-400 font-bold ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div>
            TOTAL:{' '}
            <strong className="text-theme-text font-bold">
              <AnimatedCounter value={totalMatching} />
            </strong>{' '}
            EVENTS
          </div>
        </div>
      </div>

      {/* Virtualized Messages Container */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 space-y-2 relative">
        {events.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-theme-dim">
            <p>No timeline records matching current filters.</p>
          </div>
        )}

        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const ev = events[virtualRow.index];
            if (!ev) return null;

            const actorTagStyle = getActorStyle(ev.actor);
            const dateObj = new Date(ev.timestamp);
            const timeFormatted = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const dateFormatted = dateObj.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={ev.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-2"
              >
                <div className="p-3 bg-theme-raised/40 hover:bg-theme-active/80 border border-theme-border rounded transition-all duration-150 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => onSelectActor && ev.actor && onSelectActor(ev.actor)}
                        className={`px-2 py-0.5 border text-[10px] rounded font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${actorTagStyle}`}
                      >
                        {ev.actor || 'System'}
                      </span>
                      <span className="text-[10px] text-theme-dim">#{virtualRow.index + 1}</span>
                    </div>

                    <div className="text-[10px] text-theme-dim group-hover:text-theme-muted transition-colors">
                      <span>{dateFormatted}</span> <span className="text-theme-dim/60">•</span>{' '}
                      <span>{timeFormatted}</span>
                    </div>
                  </div>

                  <div className="text-theme-text text-xs leading-relaxed break-words font-sans selection:bg-theme-border-hi selection:text-black">
                    {ev.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-4 text-theme-muted gap-2 text-xs">
            <span className="inline-block w-3 h-3 border-2 border-theme-border-hi border-t-transparent rounded-full animate-spin" />
            <span>Streaming virtual records...</span>
          </div>
        )}
      </div>
    </div>
  );
}
