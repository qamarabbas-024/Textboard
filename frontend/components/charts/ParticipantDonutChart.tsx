'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ParticipantShare {
  name: string;
  count: number;
  color?: string;
  charCount?: number;
}

interface ParticipantDonutChartProps {
  participants: ParticipantShare[];
  title?: string;
  subtitle?: string;
  size?: number;
}

const PALETTE = [
  '#00f0ff', // Electric Cyan
  '#a855f7', // Hyper Violet
  '#ff0055', // Neon Pink
  '#38bdf8', // Sky Blue
  '#00ff88', // Emerald
  '#ffe600', // Cyber Yellow
  '#f97316', // Neon Orange
  '#ec4899', // Fuchsia
];

export default function ParticipantDonutChart({
  participants,
  title = 'Participant Volume & Share Gauge',
  subtitle = 'Message distribution percentage per active participant',
  size = 280,
}: ParticipantDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = participants.reduce((sum, p) => sum + p.count, 0) || 1;
  const radius = size * 0.35;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;
  const slices = participants.slice(0, 8).map((p, index) => {
    const percent = p.count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    const color = p.color || PALETTE[index % PALETTE.length];
    return {
      ...p,
      percent,
      strokeDasharray,
      strokeDashoffset,
      color,
      index,
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Donut Gauge */}
      <div className="relative flex items-center justify-center my-3">
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          <defs>
            <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.index;
            return (
              <circle
                key={slice.index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                filter={isHovered ? 'url(#donutGlow)' : undefined}
                onMouseEnter={() => setHoveredIdx(slice.index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Telemetry Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <AnimatePresence mode="wait">
            {activeSlice ? (
              <motion.div
                key={activeSlice.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-[130px]"
              >
                <div
                  className="text-xs font-bold truncate font-mono"
                  style={{ color: activeSlice.color }}
                >
                  {activeSlice.name}
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {(activeSlice.percent * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-theme-muted font-mono">
                  {activeSlice.count.toLocaleString()} msgs
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="total"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-[10px] text-theme-muted font-mono uppercase tracking-wider">
                  Total Volume
                </div>
                <div className="text-xl font-black text-cyan-300 font-mono">
                  {total.toLocaleString()}
                </div>
                <div className="text-[10px] text-theme-muted font-mono">
                  {participants.length} actors
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-theme-border/40">
        {slices.map((slice) => {
          const isHovered = hoveredIdx === slice.index;
          return (
            <div
              key={slice.name}
              className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                isHovered
                  ? 'bg-theme-surface-active border-cyan-400/50 shadow-md'
                  : 'bg-theme-surface/40 border-transparent hover:border-theme-border'
              }`}
              onMouseEnter={() => setHoveredIdx(slice.index)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs text-theme-text font-mono truncate">{slice.name}</span>
              </div>
              <span className="text-[11px] font-bold font-mono text-theme-muted flex-shrink-0 ml-1">
                {(slice.percent * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
