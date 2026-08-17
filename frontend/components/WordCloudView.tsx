'use client';

import React, { useState, useEffect } from 'react';

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
    <div className="border border-zinc-700 bg-zinc-900 rounded p-4 mb-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
            Frequencies
          </h3>
          {activeWord && (
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded">
              Active: &ldquo;{activeWord}&rdquo;
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeWord && (
            <button
              onClick={() => onSelectWord(null)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
            >
              Clear
            </button>
          )}

          <div className="flex bg-zinc-800 rounded p-0.5 border border-zinc-700">
            <button
              onClick={() => setTab('words')}
              className={`px-2.5 py-1 text-xs rounded capitalize font-medium ${
                tab === 'words'
                  ? 'bg-zinc-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Top Words ({data?.words?.length || 0})
            </button>
            <button
              onClick={() => setTab('emojis')}
              className={`px-2.5 py-1 text-xs rounded capitalize font-medium ${
                tab === 'emojis'
                  ? 'bg-zinc-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Emojis ({data?.emojis?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          Loading frequencies (cached in Redis)...
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No items found.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
          {items.map((item) => {
            const isSelected = activeWord === item.text;
            // Relative font size weighting from 12px to 20px
            const weight = 0.75 + (item.count / maxCount) * 0.75;

            return (
              <button
                key={item.text}
                onClick={() => onSelectWord(isSelected ? null : item.text)}
                style={{ fontSize: `${weight}rem` }}
                title={`${item.text}: ${item.count.toLocaleString()} occurrences`}
                className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-750'
                }`}
              >
                <span>{item.text}</span>
                <span className="text-[10px] text-zinc-400 opacity-80">
                  {item.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
