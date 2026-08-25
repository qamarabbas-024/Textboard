'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CorrelationLissajousChartProps {
  streamAName: string;
  streamBName: string;
  hourlyScheduleA?: number[];
  hourlyScheduleB?: number[];
  synchronicityScore?: number;
  height?: number;
}

export default function CorrelationLissajousChart({
  streamAName,
  streamBName,
  hourlyScheduleA = [],
  hourlyScheduleB = [],
  synchronicityScore = 0.85,
  height = 200,
}: CorrelationLissajousChartProps) {
  const width = 720;
  const paddingX = 40;
  const paddingY = 25;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxA = Math.max(...hourlyScheduleA, 1);
  const maxB = Math.max(...hourlyScheduleB, 1);

  const pointsA = hours.map((h) => {
    const val = hourlyScheduleA[h] || 0;
    const x = paddingX + (h / 23) * (width - paddingX * 2);
    const y = height - paddingY - (val / maxA) * (height - paddingY * 2);
    return { x, y, h, val };
  });

  const pointsB = hours.map((h) => {
    const val = hourlyScheduleB[h] || 0;
    const x = paddingX + (h / 23) * (width - paddingX * 2);
    const y = height - paddingY - (val / maxB) * (height - paddingY * 2);
    return { x, y, h, val };
  });

  const generateSmoothPath = (pts: typeof pointsA) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const pathA = generateSmoothPath(pointsA);
  const pathB = generateSmoothPath(pointsB);

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              Dual-Stream Phase & Synchronicity Waveform
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">
            24-hour comparative diurnal pattern synchronicity
          </p>
        </div>

        {/* Synchronicity Metric Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs font-mono">
          <span className="text-theme-muted">Synchronicity:</span>
          <span className="text-cyan-400 font-bold text-sm">
            {(synchronicityScore * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative w-full overflow-hidden bg-black/40 rounded-xl border border-theme-border/60 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label="Dual-stream phase synchronicity chart">
          <defs>
            <filter id="waveGlowA" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="waveGlowB" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={paddingX}
              y1={height * ratio}
              x2={width - paddingX}
              y2={height * ratio}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="3 3"
            />
          ))}

          {/* Stream A Wave (Cyan) */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
            d={pathA}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2.5"
            filter="url(#waveGlowA)"
          />

          {/* Stream B Wave (Neon Pink) */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            d={pathB}
            fill="none"
            stroke="#ff0055"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            filter="url(#waveGlowB)"
          />

          {/* 24-hour markers */}
          {[0, 6, 12, 18, 23].map((h) => (
            <text
              key={h}
              x={paddingX + (h / 23) * (width - paddingX * 2)}
              y={height - 6}
              textAnchor="middle"
              className="text-[9px] font-mono fill-theme-muted"
            >
              {String(h).padStart(2, '0')}:00
            </text>
          ))}
        </svg>
      </div>

      {/* Stream Legend */}
      <div className="flex items-center justify-between mt-3 text-xs font-mono text-theme-muted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-cyan-400 rounded-full" />
          <span className="text-white font-bold">{streamAName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-rose-500 rounded-full" />
          <span className="text-white font-bold">{streamBName}</span>
        </div>
      </div>
    </div>
  );
}
