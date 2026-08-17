'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';

interface HighlightsData {
  firstMessage: any;
  longestMessage: any;
  mostEmojiMessage: any;
}

interface MilestoneItem {
  milestoneIndex: number;
  event: any;
}

interface HighlightsViewProps {
  datasetId: string;
  apiUrl: string;
}

export function HighlightsView({ datasetId, apiUrl }: HighlightsViewProps) {
  const [highlights, setHighlights] = useState<HighlightsData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [keyword, setKeyword] = useState('project');
  const [keywordResult, setKeywordResult] = useState<any>(null);
  const [searchingKeyword, setSearchingKeyword] = useState(false);
  const [randomMemory, setRandomMemory] = useState<any>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [hRes, mRes] = await Promise.all([
          fetch(`${apiUrl}/datasets/${datasetId}/highlights`),
          fetch(`${apiUrl}/datasets/${datasetId}/milestones`),
        ]);

        if (hRes.ok) setHighlights(await hRes.json());
        if (mRes.ok) setMilestones(await mRes.json());
      } catch (e) {
        console.error('Failed to load highlights', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [datasetId, apiUrl]);

  const handleKeywordSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSearchingKeyword(true);
    try {
      const res = await fetch(
        `${apiUrl}/datasets/${datasetId}/first-occurrence?keyword=${encodeURIComponent(keyword.trim())}`,
      );
      if (res.ok) {
        setKeywordResult(await res.json());
      }
    } finally {
      setSearchingKeyword(false);
    }
  };

  const fetchRandomMemory = async () => {
    setLoadingMemory(true);
    try {
      const res = await fetch(`${apiUrl}/datasets/${datasetId}/random-memory`);
      if (res.ok) {
        setRandomMemory(await res.json());
      }
    } finally {
      setLoadingMemory(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action / Random Memory Banner */}
      <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-theme-accent">🎲</span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-theme-text">
              Random Memory Recall
            </h3>
          </div>
          <p className="text-xs text-theme-muted">
            Pull an unexpected memory from anywhere across the archive.
          </p>
        </div>

        <button
          onClick={fetchRandomMemory}
          disabled={loadingMemory}
          className="px-4 py-2 bg-theme-raised hover:bg-theme-active border border-theme-border-hi/50 text-theme-accent text-xs font-bold uppercase tracking-wider rounded-theme shadow-theme-glow transition-all whitespace-nowrap"
        >
          {loadingMemory ? 'Shuffling...' : 'Pull Random Memory'}
        </button>
      </div>

      {randomMemory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-theme-border-hi/60 bg-theme-raised rounded-theme p-4 shadow-theme-glow"
        >
          <div className="flex items-center justify-between text-xs text-theme-dim mb-2 border-b border-theme-border pb-2">
            <span className="font-bold text-theme-accent">
              Memory from {new Date(randomMemory.timestamp).toLocaleDateString()}
            </span>
            <span>{randomMemory.actor || 'System'}</span>
          </div>
          <p className="text-sm text-theme-text whitespace-pre-wrap leading-relaxed">
            &ldquo;{randomMemory.content}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Main Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. First Message Ever */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-4 terminal-interactive shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-text mb-2 border-b border-theme-border pb-2">
              <span className="text-theme-accent">⏱</span> First Message Ever
            </div>
            {highlights?.firstMessage ? (
              <div>
                <div className="flex items-center justify-between text-[11px] text-theme-dim mb-1">
                  <span className="font-semibold text-theme-muted">
                    {highlights.firstMessage.actor || 'System'}
                  </span>
                  <span>{new Date(highlights.firstMessage.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="bg-theme-base border border-theme-border p-3 rounded-theme text-xs text-theme-text leading-relaxed">
                  &ldquo;{highlights.firstMessage.content}&rdquo;
                </div>
              </div>
            ) : (
              <p className="text-xs text-theme-dim">No message found</p>
            )}
          </div>
        </div>

        {/* 2. Longest Message */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-4 terminal-interactive shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-theme-text mb-2 border-b border-theme-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-theme-accent">📜</span> Longest Message
              </div>
              {highlights?.longestMessage && (
                <span className="text-[10px] text-theme-accent font-mono">
                  <AnimatedCounter value={highlights.longestMessage.charLength} /> chars
                </span>
              )}
            </div>
            {highlights?.longestMessage ? (
              <div>
                <div className="flex items-center justify-between text-[11px] text-theme-dim mb-1">
                  <span className="font-semibold text-theme-muted">
                    {highlights.longestMessage.actor}
                  </span>
                  <span>{new Date(highlights.longestMessage.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="bg-theme-base border border-theme-border p-3 rounded-theme text-xs text-theme-text max-h-32 overflow-y-auto leading-relaxed">
                  &ldquo;{highlights.longestMessage.content}&rdquo;
                </div>
              </div>
            ) : (
              <p className="text-xs text-theme-dim">No message found</p>
            )}
          </div>
        </div>

        {/* 3. Most Emoji Dense */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-4 terminal-interactive shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-theme-text mb-2 border-b border-theme-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-theme-accent">😍</span> Most Emoji-Dense
              </div>
              {highlights?.mostEmojiMessage?.emojiCount && (
                <span className="text-[10px] text-theme-accent font-mono">
                  {highlights.mostEmojiMessage.emojiCount} emojis
                </span>
              )}
            </div>
            {highlights?.mostEmojiMessage ? (
              <div>
                <div className="flex items-center justify-between text-[11px] text-theme-dim mb-1">
                  <span className="font-semibold text-theme-muted">
                    {highlights.mostEmojiMessage.actor}
                  </span>
                  <span>{new Date(highlights.mostEmojiMessage.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="bg-theme-base border border-theme-border p-3 rounded-theme text-xs text-theme-text max-h-32 overflow-y-auto leading-relaxed">
                  &ldquo;{highlights.mostEmojiMessage.content}&rdquo;
                </div>
              </div>
            ) : (
              <p className="text-xs text-theme-dim">No message found</p>
            )}
          </div>
        </div>
      </div>

      {/* Tracked Keyword First Occurrence */}
      <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-theme-accent">🔍</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
            Track First Occurrence of a Keyword
          </h3>
        </div>

        <form onSubmit={handleKeywordSearch} className="flex gap-3 mb-4">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Type any word or phrase (e.g. project, coffee, launch)..."
            className="flex-1 bg-theme-base border border-theme-border rounded-theme px-3.5 py-2 text-xs sm:text-sm text-theme-text placeholder-theme-dim focus:outline-none focus:border-theme-border-hi"
          />
          <button
            type="submit"
            disabled={searchingKeyword}
            className="px-4 py-2 bg-theme-raised hover:bg-theme-active border border-theme-border text-theme-accent text-xs font-bold uppercase rounded-theme transition-colors"
          >
            {searchingKeyword ? 'Searching...' : 'Find First Mention'}
          </button>
        </form>

        {keywordResult && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-theme-base border border-theme-border p-4 rounded-theme"
          >
            <div className="flex items-center justify-between text-xs text-theme-dim mb-2 border-b border-theme-border pb-1.5">
              <span>
                First mention of &ldquo;<strong className="text-theme-accent">{keywordResult.keyword}</strong>&rdquo;
              </span>
              <span className="font-mono text-theme-muted">
                Total mentions: <AnimatedCounter value={keywordResult.totalOccurrences} />
              </span>
            </div>

            {keywordResult.firstEvent ? (
              <div>
                <div className="text-[11px] text-theme-dim mb-1">
                  Sent by <strong className="text-theme-text">{keywordResult.firstEvent.actor}</strong> on{' '}
                  {new Date(keywordResult.firstEvent.timestamp).toLocaleString()}
                </div>
                <p className="text-xs text-theme-text whitespace-pre-wrap leading-relaxed">
                  &ldquo;{keywordResult.firstEvent.content}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-xs text-theme-dim">No occurrences found in archive.</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Milestone Markers */}
      <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-theme-border pb-2">
          <span className="text-theme-accent">🚩</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
            Historical Milestone Markers
          </h3>
        </div>

        {milestones.length === 0 ? (
          <p className="text-xs text-theme-dim">No milestones calculated yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {milestones.map((m) => (
              <div
                key={m.milestoneIndex}
                className="bg-theme-base border border-theme-border p-3.5 rounded-theme flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-theme-accent bg-theme-raised px-2 py-0.5 rounded-theme border border-theme-border">
                    #{m.milestoneIndex.toLocaleString()} Message
                  </span>
                  <span className="text-[10px] text-theme-dim">
                    {new Date(m.event?.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-theme-text line-clamp-3 leading-relaxed mb-2">
                  &ldquo;{m.event?.content}&rdquo;
                </p>
                <div className="text-[10px] text-theme-dim text-right font-medium">
                  — {m.event?.actor || 'System'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
