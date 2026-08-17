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
  apiUrl: string;
  selectedRange: { start: string | null; end: string | null };
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
  const index = Math.abs(hash) % AUTHOR_PALETTE.length;
  return AUTHOR_PALETTE[index];
}

export function ChatView({
  datasetId,
  apiUrl,
  selectedRange,
  searchQuery,
  activeWord,
  activeActor,
  onSelectActor,
  onTotalCountChange,
}: ChatViewProps) {
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalMatching, setTotalMatching] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch initial batch whenever filters change
  useEffect(() => {
    let isCancelled = false;
    async function loadFirstPage() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        if (selectedRange.start) params.set('startDate', selectedRange.start);
        if (selectedRange.end) params.set('endDate', selectedRange.end);
        if (searchQuery) params.set('search', searchQuery);
        if (activeWord) params.set('word', activeWord);
        if (activeActor) params.set('actor', activeActor);

        const res = await fetch(`${apiUrl}/datasets/${datasetId}/events?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setEvents(data.events || []);
            setNextCursor(data.nextCursor || null);
            setTotalMatching(data.totalMatching || 0);
            onTotalCountChange?.(data.totalMatching || 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch events', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadFirstPage();
    return () => {
      isCancelled = true;
    };
  }, [datasetId, apiUrl, selectedRange, searchQuery, activeWord, activeActor]);

  // Infinite scroll loader
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('cursor', nextCursor);
      if (selectedRange.start) params.set('startDate', selectedRange.start);
      if (selectedRange.end) params.set('endDate', selectedRange.end);
      if (searchQuery) params.set('search', searchQuery);
      if (activeWord) params.set('word', activeWord);
      if (activeActor) params.set('actor', activeActor);

      const res = await fetch(`${apiUrl}/datasets/${datasetId}/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [...prev, ...(data.events || [])]);
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load more events', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, apiUrl, datasetId, selectedRange, searchQuery, activeWord, activeActor]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= events.length - 10 && nextCursor && !loadingMore) {
      loadMore();
    }
  }, [virtualItems, events.length, nextCursor, loadingMore, loadMore]);

  return (
    <div className="flex flex-col h-[550px] border border-theme-border bg-theme-surface rounded-theme overflow-hidden terminal-interactive shadow-sm transition-all">
      <div className="flex items-center justify-between px-4 py-2.5 bg-theme-raised border-b border-theme-border text-xs text-theme-muted">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-theme-text">{events.length.toLocaleString()}</strong> of{' '}
            <strong className="text-theme-text">
              <AnimatedCounter value={totalMatching} />
            </strong>{' '}
            matching events
          </span>
          {activeActor && (
            <span className="bg-theme-surface text-theme-accent border border-theme-border px-2 py-0.5 rounded-theme">
              Sender: {activeActor}
            </span>
          )}
        </div>
        {loading && <span className="text-theme-accent animate-pulse">Streaming records...</span>}
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 relative">
        {loading && events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-theme-muted">
            Streaming virtualized events...
          </div>
        ) : events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-theme-muted">
            No events found matching the selected filters.
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const event = events[virtualRow.index];
              if (!event) return null;

              const isSystem = !event.actor || event.eventType === 'system_event';
              const actorStyle = getActorStyle(event.actor);
              const formattedDate = new Date(event.timestamp).toLocaleString();

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-1.5"
                >
                  {isSystem ? (
                    <div className="flex justify-center my-1">
                      <div className="text-xs bg-theme-base border border-theme-border text-theme-muted px-3.5 py-1 rounded-theme max-w-lg text-center">
                        {event.content}
                        <span className="ml-2 text-[10px] text-theme-dim">{formattedDate}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start max-w-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() =>
                            onSelectActor?.(activeActor === event.actor ? null : event.actor)
                          }
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-theme border transition-all ${actorStyle}`}
                        >
                          {event.actor}
                        </button>
                        <span className="text-[10px] text-theme-dim">{formattedDate}</span>
                      </div>
                      <div className="bg-theme-base border border-theme-border text-theme-text text-xs sm:text-sm px-3.5 py-2 rounded-theme whitespace-pre-wrap break-words leading-relaxed shadow-sm hover:border-theme-border-hi/40 transition-colors">
                        {event.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loadingMore && (
          <div className="py-2 text-center text-xs text-theme-muted">
            Loading next 50 messages...
          </div>
        )}
      </div>
    </div>
  );
}
