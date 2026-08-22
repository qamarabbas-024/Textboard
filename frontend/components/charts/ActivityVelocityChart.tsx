'use client';

import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  rawDate?: string;
}

interface ActivityVelocityChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  color?: string;
  secondaryColor?: string;
}

export default function ActivityVelocityChart({
  data,
  title = 'Message Velocity & Volume Waves',
  subtitle = 'Temporal activity distribution across time segments',
  height = 240,
  color = 'var(--accent)',
  secondaryColor = 'var(--accent-secondary)',
}: ActivityVelocityChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartId = useId().replace(/:/g, '');

  if (!data || data.length === 0) {
    return (
      <div className="glass-card-3d p-6 rounded-2xl flex flex-col items-center justify-center min-h-[240px] text-theme-muted">
        <div className="w-10 h-10 rounded-full border border-theme-border flex items-center justify-center mb-2 animate-pulse">
          ⚡
        </div>
        <p className="text-xs uppercase tracking-wider font-mono">Awaiting Velocity Data Stream...</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = 700;
  const chartHeight = height;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.value / maxValue) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  // Generate smooth cubic bezier SVG path
  const generateBezierPath = (pts: typeof points) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const linePath = generateBezierPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`;

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden border border-theme-border/60 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">{subtitle}</p>
        </div>

        {/* Peak indicator */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-theme-surface border border-theme-border/80 text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
            <span className="text-theme-muted">Peak:</span>
            <span className="text-cyan-400 font-bold">{maxValue.toLocaleString()} msgs</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`gradArea-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="60%" stopColor={secondaryColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id={`gradLine-${chartId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="50%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>

            <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-theme-dim font-mono"
                >
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <motion.path
            initial={{ opacity: 0, d: `M ${points[0].x},${chartHeight - paddingY} Z` }}
            animate={{ opacity: 1, d: areaPath }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            fill={`url(#gradArea-${chartId})`}
          />

          {/* Glowing Stroke Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            d={linePath}
            fill="none"
            stroke={`url(#gradLine-${chartId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter={`url(#glow-${chartId})`}
          />

          {/* Interactive Touch/Hover Columns */}
          {points.map((p, index) => (
            <rect
              key={index}
              x={p.x - (chartWidth / points.length) / 2}
              y={paddingY}
              width={chartWidth / points.length}
              height={chartHeight - paddingY * 2}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}

          {/* Hover Crosshair & Node Marker */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingY}
                x2={hoveredPoint.x}
                y2={chartHeight - paddingY}
                stroke="rgba(0, 240, 255, 0.5)"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill="#00f0ff"
                stroke="#04060c"
                strokeWidth="2"
                className="animate-pulse"
                filter={`url(#glow-${chartId})`}
              />
            </g>
          )}

          {/* X Axis Labels */}
          {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="text-[10px] fill-theme-muted font-mono"
            >
              {p.label}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-3 right-4 pointer-events-none glass-card-3d px-3.5 py-2 rounded-xl border border-cyan-400/40 shadow-xl"
            >
              <div className="text-[10px] text-theme-muted font-mono">{hoveredPoint.label}</div>
              <div className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                <span>{hoveredPoint.value.toLocaleString()}</span>
                <span className="text-[10px] text-theme-muted font-normal">messages</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
