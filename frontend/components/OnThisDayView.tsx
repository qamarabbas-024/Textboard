import React, { useState, useEffect } from 'react';
import { ClockIcon, SmileIcon, SparklesIcon, UsersIcon, ArrowRightIcon } from './Icons';

export interface OnThisDayMemory {
  year: number;
  yearsAgo: number;
  dateStr: string;
  messageCount: number;
  participants: string[];
  topEmoji?: string;
  sampleMessages: Array<{
    id: string;
    actor: string;
    timestamp: string | Date;
    content: string;
  }>;
}

interface OnThisDayViewProps {
  datasetId: string;
  onExploreDate?: (dateStr: string) => void;
}

export function OnThisDayView({ datasetId, onExploreDate }: OnThisDayViewProps) {
  const [memories, setMemories] = useState<OnThisDayMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    setIsLoading(true);
    fetch(`/api/v1/analytics/${datasetId}/on-this-day`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMemories(Array.isArray(data) ? data : []))
      .catch((err) => console.error('OnThisDay error:', err))
      .finally(() => setIsLoading(false));
  }, [datasetId]);

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl border border-white/[0.08] bg-[#10141d]/80 text-center font-mono text-xs text-neutral-400">
        <span className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
        Searching memory archives for this day in history...
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-white/[0.08] bg-[#10141d]/60 font-mono text-xs text-neutral-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/[0.04] text-neutral-400">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-neutral-200 uppercase tracking-wider">
              MEMORY TIME MACHINE
            </div>
            <div className="text-[11px] text-neutral-500">
              No recorded conversations found on this exact day in previous years.
            </div>
          </div>
        </div>
        <span className="text-[11px] text-neutral-500 font-mono">Today in History</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
            ON THIS DAY IN HISTORY (MEMORY TIME MACHINE)
          </h3>
        </div>
        <span className="text-[11px] text-cyan-400">
          {memories.length} Historical {memories.length === 1 ? 'Year' : 'Years'} Found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memories.map((mem) => (
          <div
            key={mem.year}
            className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold text-xs border border-cyan-500/20">
                  {mem.yearsAgo === 1 ? '1 YEAR AGO' : `${mem.yearsAgo} YEARS AGO`} ({mem.year})
                </span>
                <span className="text-[11px] text-neutral-400">{mem.dateStr}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-300 my-2">
                <span>
                  <strong>{mem.messageCount.toLocaleString()}</strong> messages
                </span>
                {mem.topEmoji && (
                  <span className="flex items-center gap-1">
                    Top Emoji: <span className="text-base">{mem.topEmoji}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 my-2">
                {mem.participants.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-neutral-300 border border-white/[0.06]"
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Sample Message Snippet */}
              {mem.sampleMessages.length > 0 && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] text-xs space-y-2 mt-3">
                  {mem.sampleMessages.slice(0, 2).map((s) => (
                    <div key={s.id} className="text-neutral-300 font-sans leading-relaxed">
                      <span className="font-mono text-[11px] font-semibold text-cyan-400 mr-2">
                        {s.actor}:
                      </span>
                      <span>{s.content.slice(0, 140)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {onExploreDate && (
              <button
                onClick={() => onExploreDate(mem.dateStr)}
                className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded bg-white/[0.04] hover:bg-cyan-500/20 hover:text-cyan-300 text-xs text-neutral-300 border border-white/[0.06] transition-colors"
              >
                <span>Jump to {mem.year} Timeline</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
