'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CircadianRadarChartProps {
  hourlyDistribution: Record<number, number> | number[];
  title?: string;
  subtitle?: string;
  size?: number;
}

export default function CircadianRadarChart({
  hourlyDistribution,
  title = '24-Hour Circadian Activity Radar',
  subtitle = 'Diurnal message distribution & peak active hours',
  size = 280,
}: CircadianRadarChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Normalize 0..23 data
  const hours = Array.from({ length: 24 }, (_, i) => {
    let count = 0;
    if (Array.isArray(hourlyDistribution)) {
      count = hourlyDistribution[i] || 0;
    } else if (hourlyDistribution && typeof hourlyDistribution === 'object') {
      count = hourlyDistribution[i] || 0;
    }
    return { hour: i, count };
  });

  const maxCount = Math.max(...hours.map((h) => h.count), 1);
  const center = size / 2;
  const radius = size * 0.38;

  // Convert hour to polar coordinates
  const getCoordinates = (hour: number, valueRatio: number) => {
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2; // 0:00 at top
    const r = radius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const radarPoints = hours.map((h) => {
    const ratio = Math.max(h.count / maxCount, 0.08);
    const coords = getCoordinates(h.hour, ratio);
    return { ...h, ...coords, ratio };
  });

  const polygonPath = radarPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
  }, '') + ' Z';

  const activeData = hoveredHour !== null ? hours[hoveredHour] : null;

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Radar SVG Container */}
      <div className="relative flex items-center justify-center my-2">
        <svg width={size} height={size} className="overflow-visible" role="img" aria-label="24-hour circadian radar distribution chart">
          <defs>
            <radialGradient id="radarRadialGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#04060c" stopOpacity="0" />
            </radialGradient>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Concentric Grid Rings */}
          {[0.25, 0.5, 0.75, 1].map((r, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius * r}
              fill={i === 3 ? 'rgba(0, 240, 255, 0.02)' : 'none'}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray={i < 3 ? '3 3' : 'none'}
            />
          ))}

          {/* 4 Cardinal Hour Spokes */}
          {[0, 6, 12, 18].map((h) => {
            const end = getCoordinates(h, 1.05);
            const labelCoords = getCoordinates(h, 1.2);
            return (
              <g key={h}>
                <line
                  x1={center}
                  y1={center}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <text
                  x={labelCoords.x}
                  y={labelCoords.y + 4}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-theme-muted font-bold"
                >
                  {h === 0 ? '00:00' : h === 6 ? '06:00' : h === 12 ? '12:00' : '18:00'}
                </text>
              </g>
            );
          })}

          {/* Filled Radar Area */}
          <motion.path
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            d={polygonPath}
            fill="url(#radarRadialGlow)"
            stroke="#00f0ff"
            strokeWidth="2"
            filter="url(#radarGlow)"
          />

          {/* Interactive Vertex Nodes */}
          {radarPoints.map((p) => {
            const isHovered = hoveredHour === p.hour;
            return (
              <g key={p.hour} className="cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : p.count > 0 ? 3.5 : 2}
                  fill={isHovered ? '#ff0055' : p.hour >= 0 && p.hour <= 5 ? '#a855f7' : '#00f0ff'}
                  stroke="#04060c"
                  strokeWidth={1.5}
                  onMouseEnter={() => setHoveredHour(p.hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                />
              </g>
            );
          })}

          {/* Center Pulsing Hub */}
          <circle cx={center} cy={center} r="4" fill="#00f0ff" className="animate-pulse" />
        </svg>

        {/* Center Hover Stats Display */}
        <AnimatePresence>
          {activeData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none text-center bg-black/80 px-3 py-1.5 rounded-lg border border-cyan-400/40 backdrop-blur-md"
            >
              <div className="text-[10px] font-mono text-cyan-400 font-bold">
                {String(activeData.hour).padStart(2, '0')}:00
              </div>
              <div className="text-xs font-bold text-white font-mono">
                {activeData.count.toLocaleString()} msgs
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend Footer */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-theme-muted pt-2 border-t border-theme-border/40">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span>Late Night (00:00 - 05:00)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
          <span>Daytime Active</span>
        </div>
      </div>
    </div>
  );
}
