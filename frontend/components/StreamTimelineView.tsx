import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatedCounter } from './AnimatedCounter';
import { VoiceNotePlayer } from './VoiceNotePlayer';

export interface TimelineEventItem {
  id: string;
  datasetId: string;
  timestamp: string;
  actor: string | null;
  content: string;
  eventType: string;
  hasMedia?: boolean;
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
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
];

function getActorTheme(actor: string | null) {
  if (!actor) return { text: 'text-neutral-400', bg: 'bg-white/[0.05]', border: 'border-white/[0.1]' };
  let hash = 0;
  for (let i = 0; i < actor.length; i++) {
    hash = (hash << 5) - hash + actor.charCodeAt(i);
    hash |= 0;
  }
  return AUTHOR_PALETTE[Math.abs(hash) % AUTHOR_PALETTE.length];
}

interface MediaBadgeInfo {
  isMedia: boolean;
  type: 'sticker' | 'image' | 'video' | 'audio' | 'document' | 'contact' | 'media';
  icon: string;
  label: string;
  filename?: string;
  badgeStyle: string;
}

function parseMediaBadge(content: string, hasMedia?: boolean): MediaBadgeInfo {
  const trimmed = (content || '').trim();

  // 1. Sticker: STK-*.webp, sticker.webp, [Sticker], <sticker omitted>
  if (
    /STK-[\w-]+\.webp/i.test(trimmed) ||
    /sticker\.webp/i.test(trimmed) ||
    /\.webp\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    trimmed.toLowerCase() === '<sticker omitted>' ||
    trimmed.toLowerCase() === '[sticker]'
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.webp)/i);
    return {
      isMedia: true,
      type: 'sticker',
      icon: '🎨',
      label: 'STICKER',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-purple-950/40 border-purple-500/40 text-purple-300',
    };
  }

  // 2. Photo: IMG-*.jpg, *.png
  if (
    /IMG-[\w-]+\.(jpg|jpeg|png|heic)/i.test(trimmed) ||
    /\.(jpg|jpeg|png|heic)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    trimmed.toLowerCase() === '<image omitted>'
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(jpg|jpeg|png|heic))/i);
    return {
      isMedia: true,
      type: 'image',
      icon: '📷',
      label: 'PHOTO',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-blue-950/40 border-blue-500/40 text-blue-300',
    };
  }

  // 3. Video: VID-*.mp4
  if (
    /VID-[\w-]+\.(mp4|mov|3gp|mkv)/i.test(trimmed) ||
    /\.(mp4|mov|3gp|mkv)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    trimmed.toLowerCase() === '<video omitted>'
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(mp4|mov|3gp|mkv))/i);
    return {
      isMedia: true,
      type: 'video',
      icon: '🎥',
      label: 'VIDEO',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-rose-950/40 border-rose-500/40 text-rose-300',
    };
  }

  // 4. Voice Note / Audio: AUD-*, PTT-*, *.opus
  if (
    /(AUD|PTT)-[\w-]+\.(opus|mp3|m4a|aac|wav|ogg)/i.test(trimmed) ||
    /\.(opus|mp3|m4a|aac|wav|ogg)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    trimmed.toLowerCase() === '<audio omitted>'
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(opus|mp3|m4a|aac|wav|ogg))/i);
    return {
      isMedia: true,
      type: 'audio',
      icon: '🎤',
      label: 'VOICE NOTE / AUDIO',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
    };
  }

  // 5. Contact Card: *.vcf
  if (/\.vcf\s*\(\s*file attached\s*\)/i.test(trimmed)) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.vcf)/i);
    return {
      isMedia: true,
      type: 'contact',
      icon: '👤',
      label: 'CONTACT CARD',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-amber-950/40 border-amber-500/40 text-amber-300',
    };
  }

  // 6. Document: *.pdf, *.docx, *.zip
  if (
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    trimmed.toLowerCase() === '<document omitted>'
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt))/i);
    return {
      isMedia: true,
      type: 'document',
      icon: '📄',
      label: 'DOCUMENT',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      badgeStyle: 'bg-slate-900 border-slate-700 text-slate-300',
    };
  }

  // 7. Generic Media / Sticker omitted
  if (hasMedia || trimmed.includes('<Media omitted>') || trimmed.includes('[Media]') || trimmed.toLowerCase().includes('omitted')) {
    return {
      isMedia: true,
      type: 'sticker',
      icon: '🎨',
      label: 'STICKER / MEDIA ATTACHMENT',
      filename: 'Sticker / Media attachment',
      badgeStyle: 'bg-purple-950/40 border-purple-500/40 text-purple-300',
    };
  }

  return { isMedia: false, type: 'media', icon: '', label: '', badgeStyle: '' };
}

export function StreamTimelineView({
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
  const [primaryActor, setPrimaryActor] = useState<string | null>(null);
  const [distinctActors, setDistinctActors] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const copyMessage = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const renderHighlightedText = (content: string, highlight?: string | null) => {
    if (!highlight || !highlight.trim()) return content;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = content.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-cyan-400/30 text-cyan-200 px-0.5 rounded font-semibold border-b border-cyan-400">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Fetch distinct actors for primary sender alignment
  useEffect(() => {
    if (!datasetId) return;
    const base = apiUrl || '';
    fetch(`${base}/api/v1/datasets/${datasetId}/people`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.people)) {
          const names = data.people.map((p: any) => p.actor).filter(Boolean);
          setDistinctActors(names);
          if (names.length > 0 && !primaryActor) {
            // Default: 2nd actor or 1st actor as "Me"
            setPrimaryActor(names.length > 1 ? names[1] : names[0]);
          }
        }
      })
      .catch(() => {});
  }, [datasetId, apiUrl]);

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
        setTotalMatching(data.totalMatching || 0);
        if (onTotalCountChange) onTotalCountChange(data.totalMatching || 0);

        setEvents((prev) => (append ? [...prev, ...(data.events || [])] : data.events || []));
        setNextCursor(data.nextCursor || null);
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
    estimateSize: () => 76,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= events.length - 2 && hasMore && !isLoading && nextCursor) {
      fetchPage(nextCursor, true);
    }
  }, [virtualItems, events.length, hasMore, isLoading, nextCursor, fetchPage]);

  return (
    <div className="flex flex-col h-[700px] w-full bg-[#0d1017] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
      {/* Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#121620] border-b border-white/[0.08] text-neutral-400 select-none">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-neutral-200 tracking-wider">VISUAL TIMELINE STREAM</span>
          <span className="text-neutral-500 text-[11px]">({events.length.toLocaleString()} of {totalMatching.toLocaleString()} loaded)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {/* Primary Actor Switcher (Right Side) */}
          {distinctActors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Sent by (Right Side):</span>
              <select
                value={primaryActor || ''}
                onChange={(e) => setPrimaryActor(e.target.value || null)}
                className="bg-black/50 border border-white/[0.12] rounded px-2 py-0.5 text-[11px] text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500/50"
              >
                {distinctActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeActor && (
            <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.12] px-2 py-0.5 rounded text-cyan-300">
              <span>Filter: {activeActor}</span>
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
            <strong className="text-cyan-300 font-bold">
              <AnimatedCounter value={totalMatching} />
            </strong>{' '}
            ENTRIES
          </div>
        </div>
      </div>

      {/* Virtualized Messages Stream Container */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 relative space-y-2 bg-[#090b10]">
        {events.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
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

            const isSent = primaryActor && ev.actor ? ev.actor.toLowerCase() === primaryActor.toLowerCase() : false;
            const theme = getActorTheme(ev.actor);
            const media = parseMediaBadge(ev.content, ev.hasMedia);
            const isPureMedia = media.isMedia && (
              ev.content.includes('(file attached)') ||
              ev.content.includes('<Media omitted>') ||
              ev.content.includes('[Media]') ||
              ev.content.toLowerCase() === '<sticker omitted>'
            );

            const dateObj = new Date(ev.timestamp);
            const timeFormatted = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
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
                className="pb-2 flex"
              >
                <div className={`w-full flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl p-3.5 transition-all duration-150 shadow-md ${
                      isSent
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 rounded-tr-xs ml-auto'
                        : 'bg-[#151b26] border border-white/[0.1] text-neutral-100 rounded-tl-xs mr-auto'
                    }`}
                  >
                    {/* Header: Sender Badge (Only for Received / Left side) */}
                    {!isSent && ev.actor && (
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/[0.04]">
                        <span
                          onClick={() => onSelectActor && ev.actor && onSelectActor(ev.actor)}
                          className={`text-[11px] font-bold tracking-wide cursor-pointer hover:underline ${theme.text}`}
                        >
                          {ev.actor}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">#{virtualRow.index + 1}</span>
                      </div>
                    )}

                    {/* Media / Sticker Card */}
                    {media.isMedia && (
                      <div className={`rounded-lg px-3 py-2 border mb-2 flex items-center gap-2.5 ${media.badgeStyle}`}>
                        <span className="text-base">{media.icon}</span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-[11px] uppercase tracking-wider">{media.label}</div>
                          {media.filename && (
                            <div className="text-[10px] opacity-80 truncate font-mono">{media.filename}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interactive Voice Note Audio Player with Waveform Equalizer */}
                    {media.type === 'audio' && (
                      <VoiceNotePlayer
                        filename={media.filename || 'voice_note.opus'}
                        durationSeconds={ev.metadata?.audioDuration || 18}
                        seed={ev.id}
                      />
                    )}

                    {/* OCR Text Match Badge */}
                    {ev.metadata?.ocrMatched && (
                      <div className="mb-2 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center gap-1.5">
                        <span>🔍</span>
                        <span>OCR Attachment Match: &ldquo;{searchQuery}&rdquo; detected inside image</span>
                      </div>
                    )}

                    {/* Message Text Content */}
                    {!isPureMedia && (
                      <div className="text-xs leading-relaxed break-words font-sans selection:bg-cyan-500/30 selection:text-white group relative">
                        {renderHighlightedText(ev.content, searchQuery || activeWord)}
                      </div>
                    )}

                    {/* Footer: Date & Timestamp & Quick Actions */}
                    <div className={`flex items-center gap-2 mt-1.5 text-[10px] font-mono select-none ${
                      isSent ? 'text-emerald-400/70 justify-end' : 'text-neutral-500 justify-between'
                    }`}>
                      {!isSent && (
                        <button
                          onClick={() => copyMessage(ev.content, ev.id)}
                          className="opacity-40 hover:opacity-100 hover:text-cyan-300 transition-opacity text-[9px] px-1 py-0.5 rounded bg-white/[0.04]"
                          title="Copy message text"
                        >
                          {copiedId === ev.id ? '✓ COPIED' : 'COPY'}
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        {isSent && (
                          <button
                            onClick={() => copyMessage(ev.content, ev.id)}
                            className="opacity-40 hover:opacity-100 hover:text-emerald-300 transition-opacity text-[9px] px-1 py-0.5 rounded bg-white/[0.04]"
                            title="Copy message text"
                          >
                            {copiedId === ev.id ? '✓ COPIED' : 'COPY'}
                          </button>
                        )}
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span>{timeFormatted}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-4 text-neutral-400 gap-2 text-xs">
            <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Streaming virtual records...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { StreamTimelineView as ChatView };
