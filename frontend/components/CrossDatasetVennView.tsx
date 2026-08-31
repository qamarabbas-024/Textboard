'use client';

import React, { useState } from 'react';

interface CrossDatasetVennProps {
  datasetAName?: string;
  datasetBName?: string;
  actorsA?: string[];
  actorsB?: string[];
  sharedActors?: string[];
  jaccardSimilarity?: number;
}

export function CrossDatasetVennView({
  datasetAName = 'Stream A',
  datasetBName = 'Stream B',
  actorsA = ['Alice', 'Bob', 'Charlie', 'Dave'],
  actorsB = ['Alice', 'Bob', 'Eve', 'Frank', 'Grace'],
  sharedActors = ['Alice', 'Bob'],
  jaccardSimilarity = 0.4,
}: CrossDatasetVennProps) {
  const [selectedZone, setSelectedZone] = useState<'A' | 'SHARED' | 'B' | null>('SHARED');

  const onlyInA = actorsA.filter((a) => !sharedActors.includes(a));
  const onlyInB = actorsB.filter((b) => !sharedActors.includes(b));

  return (
    <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md space-y-6 shadow-2xl font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg text-cyan-400">
            📊
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide text-neutral-100 uppercase">
              Cross-Dataset Identity Overlap &amp; Venn Matrix
            </h2>
            <p className="text-xs text-neutral-400">
              Co-occurrence of participants, shared aliases, and cross-platform communication intersections
            </p>
          </div>
        </div>

        {/* Jaccard Similarity Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs">
            Jaccard Index: <span className="font-bold text-cyan-200">{(jaccardSimilarity * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 1. Interactive SVG Venn Diagram */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-xl bg-black/50 border border-white/[0.06] select-none">
          <svg viewBox="0 0 440 240" className="w-full max-w-[420px] h-[220px]">
            <defs>
              {/* Radial Gradients */}
              <radialGradient id="vennA" cx="35%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="vennB" cx="65%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="vennShared" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
              </radialGradient>
            </defs>

            {/* Circle A */}
            <circle
              cx="160"
              cy="120"
              r="95"
              fill="url(#vennA)"
              stroke="#06b6d4"
              strokeWidth={selectedZone === 'A' ? 2.5 : 1.5}
              strokeDasharray={selectedZone === 'A' ? 'none' : '4 4'}
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedZone('A')}
            />

            {/* Circle B */}
            <circle
              cx="280"
              cy="120"
              r="95"
              fill="url(#vennB)"
              stroke="#f43f5e"
              strokeWidth={selectedZone === 'B' ? 2.5 : 1.5}
              strokeDasharray={selectedZone === 'B' ? 'none' : '4 4'}
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedZone('B')}
            />

            {/* Shared Central Hotspot (Invisible trigger or highlighted zone) */}
            <ellipse
              cx="220"
              cy="120"
              rx="40"
              ry="70"
              fill={selectedZone === 'SHARED' ? 'url(#vennShared)' : 'transparent'}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedZone('SHARED')}
            />

            {/* Text Labels inside Circles */}
            <text x="110" y="115" fill="#67e8f9" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {onlyInA.length}
            </text>
            <text x="110" y="132" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Only in A
            </text>

            <text x="220" y="115" fill="#f3e8ff" fontSize="14" fontWeight="black" fontFamily="monospace" textAnchor="middle">
              {sharedActors.length}
            </text>
            <text x="220" y="132" fill="#c084fc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              SHARED
            </text>

            <text x="330" y="115" fill="#fda4af" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {onlyInB.length}
            </text>
            <text x="330" y="132" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Only in B
            </text>

            {/* Stream Legend Titles */}
            <text x="110" y="32" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {datasetAName.length > 16 ? datasetAName.slice(0, 14) + '…' : datasetAName}
            </text>
            <text x="330" y="32" fill="#f43f5e" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {datasetBName.length > 16 ? datasetBName.slice(0, 14) + '…' : datasetBName}
            </text>
          </svg>

          {/* Quick Zone Toggle Buttons */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            <button
              onClick={() => setSelectedZone('A')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                selectedZone === 'A' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-white/[0.08] text-neutral-400'
              }`}
            >
              Only {datasetAName} ({onlyInA.length})
            </button>
            <button
              onClick={() => setSelectedZone('SHARED')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                selectedZone === 'SHARED' ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold' : 'border-white/[0.08] text-neutral-400'
              }`}
            >
              Shared Intersections ({sharedActors.length})
            </button>
            <button
              onClick={() => setSelectedZone('B')}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                selectedZone === 'B' ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'border-white/[0.08] text-neutral-400'
              }`}
            >
              Only {datasetBName} ({onlyInB.length})
            </button>
          </div>
        </div>

        {/* 2. Zone Inspector & Participant List */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-black/50 border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedZone === 'SHARED'
                ? 'Shared Participants (Cross-Stream)'
                : selectedZone === 'A'
                ? `Exclusive to ${datasetAName}`
                : `Exclusive to ${datasetBName}`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300">
              {selectedZone === 'SHARED' ? sharedActors.length : selectedZone === 'A' ? onlyInA.length : onlyInB.length} contacts
            </span>
          </div>

          <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
            {(selectedZone === 'SHARED' ? sharedActors : selectedZone === 'A' ? onlyInA : onlyInB).map((actor, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-neutral-200 font-bold">{actor}</span>
                </div>
                <span className="text-[10px] text-neutral-500">
                  {selectedZone === 'SHARED' ? 'Linked Identity' : 'Single Stream'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
