'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FrequencyItem {
  text: string;
  count: number;
}

interface FrequenciesData {
  datasetId: string;
  totalWords: number;
  totalEmojis: number;
  words: FrequencyItem[];
  emojis: FrequencyItem[];
  computedInMs: number;
}

interface WordCloudViewProps {
  datasetId: string;
  apiUrl: string;
  activeWord: string | null;
  onSelectWord: (word: string | null) => void;
}

export function WordCloudView({
  datasetId,
  apiUrl,
  activeWord,
  onSelectWord,
}: WordCloudViewProps) {
  const [data, setData] = useState<FrequenciesData | null>(null);
  const [tab, setTab] = useState<'words' | 'emojis'>('words');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadFrequencies() {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/datasets/${datasetId}/frequencies`);
        if (res.ok) {
          const resData: FrequenciesData = await res.json();
          if (!isCancelled) {
            setData(resData);
          }
        }
      } catch (err) {
        console.error('Failed to load frequency data', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadFrequencies();
    return () => {
      isCancelled = true;
    };
  }, [datasetId, apiUrl]);

  const items = tab === 'words' ? data?.words || [] : data?.emojis || [];
  const maxCount = Math.max(1, ...(items.map((i) => i.count) || [1]));

  return (
    <div className="border border-theme-border bg-theme-surface rounded-theme p-4 mb-4 terminal-interactive transition-all shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-theme-accent text-xs">⚡</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Frequencies &amp; Entities
            </h3>
          </div>

          {activeWord && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[11px] bg-theme-raised text-theme-accent border border-theme-border px-2 py-0.5 rounded-theme font-medium"
            >
              Filter: &ldquo;{activeWord}&rdquo;
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeWord && (
            <button
              onClick={() => onSelectWord(null)}
              className="text-xs bg-theme-raised hover:bg-theme-active text-theme-muted hover:text-theme-text px-2.5 py-1 rounded-theme border border-theme-border transition-colors"
            >
              Clear
            </button>
          )}

          <div className="flex bg-theme-raised rounded-theme p-0.5 border border-theme-border">
            <button
              onClick={() => setTab('words')}
              className={`px-3 py-1 text-xs rounded-theme capitalize font-medium transition-all ${
                tab === 'words'
                  ? 'bg-theme-surface text-theme-accent shadow-sm border border-theme-border font-semibold'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              Top Words ({data?.words?.length || 0})
            </button>
            <button
              onClick={() => setTab('emojis')}
              className={`px-3 py-1 text-xs rounded-theme capitalize font-medium transition-all ${
                tab === 'emojis'
                  ? 'bg-theme-surface text-theme-accent shadow-sm border border-theme-border font-semibold'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              Emojis ({data?.emojis?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-8 text-center text-xs text-theme-muted">
          Loading frequencies (cached in Redis)...
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-theme-muted">
          No frequency data available.
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto p-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2"
            >
              {items.map((item) => {
                const isSelected = activeWord === item.text;
                const weight = 0.75 + (item.count / maxCount) * 0.75;

                return (
                  <button
                    key={item.text}
                    onClick={() => onSelectWord(isSelected ? null : item.text)}
                    style={{ fontSize: `${weight}rem` }}
                    title={`${item.text}: ${item.count.toLocaleString()} occurrences`}
                    className={`px-2.5 py-1 rounded-theme border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-theme-accent text-theme-base border-theme-border-hi font-bold shadow-theme-glow'
                        : 'bg-theme-raised border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-border-hi/60 hover:bg-theme-active'
                    }`}
                  >
                    <span>{item.text}</span>
                    <span className="text-[10px] opacity-75">
                      {item.count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
