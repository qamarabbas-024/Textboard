'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

const AUTHOR_COLORS = [
  'bg-emerald-950 text-emerald-300 border-emerald-800',
  'bg-cyan-950 text-cyan-300 border-cyan-800',
  'bg-violet-950 text-violet-300 border-violet-800',
  'bg-amber-950 text-amber-300 border-amber-800',
  'bg-rose-950 text-rose-300 border-rose-800',
  'bg-blue-950 text-blue-300 border-blue-800',
  'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-800',
  'bg-teal-950 text-teal-300 border-teal-800',
];

function getActorStyle(actor: string | null) {
  if (!actor) return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let hash = 0;
  for (let i = 0; i < actor.length; i++) {
    hash = (hash << 5) - hash + actor.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AUTHOR_COLORS.length;
  return AUTHOR_COLORS[index];
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

  // React Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger loadMore when scrolling close to end
  useEffect(() => {
    if (virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= events.length - 10 && nextCursor && !loadingMore) {
      loadMore();
    }
  }, [virtualItems, events.length, nextCursor, loadingMore, loadMore]);

  return (
    <div className="flex flex-col h-[550px] border border-zinc-700 bg-zinc-950 rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-zinc-200">{events.length.toLocaleString()}</strong> of{' '}
            <strong className="text-zinc-200">{totalMatching.toLocaleString()}</strong> matching messages
          </span>
          {activeActor && (
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded">
              Sender: {activeActor}
            </span>
          )}
        </div>
        {loading && <span className="text-amber-400">Loading...</span>}
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 relative">
        {loading && events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">
            Loading messages...
          </div>
        ) : events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">
            No messages found matching the selected filters.
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
                      <div className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1 rounded-full max-w-lg text-center">
                        {event.content}
                        <span className="ml-2 text-[10px] text-zinc-600">{formattedDate}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start max-w-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() =>
                            onSelectActor?.(activeActor === event.actor ? null : event.actor)
                          }
                          className={`text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${actorStyle}`}
                        >
                          {event.actor}
                        </button>
                        <span className="text-[10px] text-zinc-500">{formattedDate}</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm px-3.5 py-2 rounded-lg whitespace-pre-wrap break-words leading-relaxed shadow-sm">
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
          <div className="py-2 text-center text-xs text-zinc-500">
            Loading next 50 messages...
          </div>
        )}
      </div>
    </div>
  );
}
