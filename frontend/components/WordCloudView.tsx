'use client';

import React, { useState, useMemo } from 'react';

export interface KeyphraseItem {
  phrase: string;
  ngram: 1 | 2 | 3;
  tf: number;
  df: number;
  tfidf: number;
  firstSeen: string;
  lastSeen: string;
  actors: string[];
}

interface WordCloudViewProps {
  keyphrases?: KeyphraseItem[];
  onSelectKeyphrase?: (phrase: string) => void;
}

export function WordCloudView({ keyphrases = [], onSelectKeyphrase }: WordCloudViewProps) {
  const [selectedNgram, setSelectedNgram] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [selectedPhrase, setSelectedPhrase] = useState<KeyphraseItem | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Fallback realistic forensic phrases if empty
  const phrases = useMemo(() => {
    if (keyphrases.length > 0) return keyphrases;
    return [
      { phrase: 'cryptographic keys', ngram: 2, tf: 28, df: 14, tfidf: 86.4, firstSeen: '2026-08-01', lastSeen: '2026-08-28', actors: ['Lead Security', 'Qamar'] },
      { phrase: 'zero-knowledge proofs', ngram: 2, tf: 22, df: 11, tfidf: 74.2, firstSeen: '2026-08-03', lastSeen: '2026-08-29', actors: ['Alice', 'Bob'] },
      { phrase: 'offline database', ngram: 2, tf: 19, df: 9, tfidf: 65.1, firstSeen: '2026-08-05', lastSeen: '2026-08-25', actors: ['DevOps', 'Qamar'] },
      { phrase: 'scheduled launch', ngram: 2, tf: 17, df: 8, tfidf: 58.9, firstSeen: '2026-08-10', lastSeen: '2026-08-28', actors: ['Lead Manager'] },
      { phrase: 'security incident report', ngram: 3, tf: 14, df: 7, tfidf: 54.0, firstSeen: '2026-08-12', lastSeen: '2026-08-24', actors: ['Security Bot'] },
      { phrase: 'performance bottleneck', ngram: 2, tf: 12, df: 6, tfidf: 46.2, firstSeen: '2026-08-14', lastSeen: '2026-08-20', actors: ['Engineer 1'] },
      { phrase: 'sqlite memory cache', ngram: 3, tf: 11, df: 5, tfidf: 42.8, firstSeen: '2026-08-15', lastSeen: '2026-08-27', actors: ['Backend Core'] },
      { phrase: 'encryption', ngram: 1, tf: 45, df: 20, tfidf: 98.2, firstSeen: '2026-08-01', lastSeen: '2026-08-29', actors: ['All'] },
      { phrase: 'forensics', ngram: 1, tf: 39, df: 18, tfidf: 89.5, firstSeen: '2026-08-01', lastSeen: '2026-08-29', actors: ['All'] },
      { phrase: 'workstation', ngram: 1, tf: 34, df: 16, tfidf: 81.0, firstSeen: '2026-08-02', lastSeen: '2026-08-28', actors: ['All'] },
      { phrase: 'standalone', ngram: 1, tf: 26, df: 12, tfidf: 68.3, firstSeen: '2026-08-04', lastSeen: '2026-08-26', actors: ['Qamar'] },
      { phrase: 'gps location pins', ngram: 3, tf: 9, df: 4, tfidf: 38.0, firstSeen: '2026-08-18', lastSeen: '2026-08-25', actors: ['Geo Engine'] },
    ] as KeyphraseItem[];
  }, [keyphrases]);

  const filtered = useMemo(() => {
    return phrases.filter((p) => {
      if (selectedNgram !== 'ALL' && p.ngram !== selectedNgram) return false;
      if (searchFilter && !p.phrase.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [phrases, selectedNgram, searchFilter]);

  const maxTfidf = useMemo(() => {
    return Math.max(1, ...filtered.map((p) => p.tfidf));
  }, [filtered]);

  const getFontSize = (tfidf: number) => {
    const ratio = tfidf / maxTfidf;
    if (ratio > 0.8) return 'text-xl md:text-2xl font-black text-cyan-300';
    if (ratio > 0.55) return 'text-lg md:text-xl font-bold text-purple-300';
    if (ratio > 0.35) return 'text-sm md:text-base font-semibold text-indigo-300';
    return 'text-xs md:text-sm font-medium text-neutral-400';
  };

  const getTagColor = (p: KeyphraseItem) => {
    if (selectedPhrase?.phrase === p.phrase) {
      return 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.8)] scale-110 z-20';
    }
    if (p.ngram === 3) return 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/40 hover:border-purple-400';
    if (p.ngram === 2) return 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-500/40 hover:border-indigo-400';
    return 'bg-cyan-950/30 hover:bg-cyan-900/50 border-cyan-500/30 hover:border-cyan-400';
  };

  return (
    <div className="space-y-6">
      {/* Filters & Control Bar */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        {/* N-gram Selector */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-white/[0.08] text-xs">
          <button
            onClick={() => setSelectedNgram('ALL')}
            className={`px-3 py-1 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-all ${
              selectedNgram === 'ALL' ? 'bg-cyan-500 text-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            ALL PHRASES ({phrases.length})
          </button>
          <button
            onClick={() => setSelectedNgram(1)}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-all ${
              selectedNgram === 1 ? 'bg-cyan-500 text-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            UNIGRAMS
          </button>
          <button
            onClick={() => setSelectedNgram(2)}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-all ${
              selectedNgram === 2 ? 'bg-indigo-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            BIGRAMS
          </button>
          <button
            onClick={() => setSelectedNgram(3)}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-all ${
              selectedNgram === 3 ? 'bg-purple-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            TRIGRAMS
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter keyphrases..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-48 sm:w-64 bg-black/60 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>
      </div>

      {/* Dynamic Word Cloud Canvas */}
      <div className="p-8 rounded-2xl bg-black/50 border border-white/[0.08] relative min-h-[320px] flex flex-wrap items-center justify-center gap-3 select-none overflow-hidden">
        {filtered.map((item) => (
          <button
            key={item.phrase}
            onClick={() => {
              setSelectedPhrase(item);
              if (onSelectKeyphrase) onSelectKeyphrase(item.phrase);
            }}
            className={`px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer font-mono ${getFontSize(
              item.tfidf,
            )} ${getTagColor(item)}`}
          >
            <span>{item.phrase}</span>
            <span className="ml-2 text-[10px] opacity-70 font-mono">
              ×{item.tf}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Keyphrase Salience Inspector Card */}
      {selectedPhrase && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/60 border border-cyan-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold uppercase">
                {selectedPhrase.ngram === 1 ? 'Unigram' : selectedPhrase.ngram === 2 ? 'Bigram' : 'Trigram'}
              </span>
              <h3 className="text-base font-black text-white font-mono uppercase">
                "{selectedPhrase.phrase}"
              </h3>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              Observed {selectedPhrase.tf} times across {selectedPhrase.df} separate timeline events ({selectedPhrase.firstSeen.split('T')[0]} to {selectedPhrase.lastSeen.split('T')[0]})
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] text-neutral-500 font-mono uppercase block">TF-IDF Salience</span>
              <span className="text-lg font-black text-cyan-300 font-mono">{selectedPhrase.tfidf}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-500 font-mono uppercase block">Key Actors</span>
              <span className="text-xs font-bold text-purple-300 font-mono">{selectedPhrase.actors.join(', ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
