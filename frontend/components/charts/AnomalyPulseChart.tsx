'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AnomalyIncident {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'NOTE';
  timestamp: string;
  title: string;
  description: string;
  metrics?: Record<string, any>;
}

interface AnomalyPulseChartProps {
  anomalies: AnomalyIncident[];
  title?: string;
  subtitle?: string;
  height?: number;
}

export default function AnomalyPulseChart({
  anomalies,
  title = 'Forensic Threat & Anomaly Radar Oscilloscope',
  subtitle = 'Real-time telemetry pulse of detected communication anomalies',
  height = 180,
}: AnomalyPulseChartProps) {
  const [hoveredAnomaly, setHoveredAnomaly] = useState<AnomalyIncident | null>(null);

  const width = 720;
  const paddingX = 30;
  const paddingY = 24;

  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = anomalies.filter((a) => a.severity === 'WARNING').length;
  const noteCount = anomalies.filter((a) => a.severity === 'NOTE').length;

  // Generate synthetic audio/EKG waveform with spikes at anomaly timestamps
  const pointCount = 60;
  const waveformPoints: Array<{ x: number; y: number; anomaly?: AnomalyIncident }> = [];

  for (let i = 0; i < pointCount; i++) {
    const x = paddingX + (i / (pointCount - 1)) * (width - paddingX * 2);
    // Baseline noise
    let amp = Math.sin(i * 0.4) * 4 + (Math.random() - 0.5) * 6;
    let matchingAnomaly: AnomalyIncident | undefined;

    // Check if an anomaly maps near this index
    const mappedAnomaly = anomalies[i % (anomalies.length || 1)];
    if (anomalies.length > 0 && i % Math.max(Math.floor(pointCount / anomalies.length), 3) === 0) {
      matchingAnomaly = mappedAnomaly;
      const spikeMultiplier =
        matchingAnomaly?.severity === 'CRITICAL'
          ? 45
          : matchingAnomaly?.severity === 'WARNING'
          ? 28
          : 15;
      amp += (i % 2 === 0 ? 1 : -1) * spikeMultiplier;
    }

    const y = height / 2 + amp;
    waveformPoints.push({ x, y, anomaly: matchingAnomaly });
  }

  const wavePath = waveformPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
  }, '');

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">{subtitle}</p>
        </div>

        {/* Severity Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
            {criticalCount} Critical
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
            {warningCount} Warning
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            {noteCount} Notice
          </span>
        </div>
      </div>

      {/* SVG Oscilloscope Waveform */}
      <div className="relative w-full overflow-hidden bg-black/40 rounded-xl border border-theme-border/60 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="40%" stopColor="#ff0055" />
              <stop offset="70%" stopColor="#ffe600" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>

            <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid Background Matrix */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={paddingX}
              y1={height * ratio}
              x2={width - paddingX}
              y2={height * ratio}
              stroke="rgba(0, 240, 255, 0.08)"
              strokeDasharray="2 4"
            />
          ))}

          {/* Center Zero Axis */}
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
          />

          {/* Waveform Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'linear' }}
            d={wavePath}
            fill="none"
            stroke="url(#waveGrad)"
            strokeWidth="2"
            filter="url(#waveGlow)"
          />

          {/* Anomaly Spikes Points */}
          {waveformPoints
            .filter((p) => p.anomaly)
            .map((p, i) => {
              const an = p.anomaly!;
              const color =
                an.severity === 'CRITICAL'
                  ? '#ff0055'
                  : an.severity === 'WARNING'
                  ? '#fbbf24'
                  : '#00f0ff';
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAnomaly(an)}
                  onMouseLeave={() => setHoveredAnomaly(null)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={6}
                    fill={color}
                    stroke="#04060c"
                    strokeWidth={2}
                    className="animate-pulse"
                  />
                  <line
                    x1={p.x}
                    y1={height / 2}
                    x2={p.x}
                    y2={p.y}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                </g>
              );
            })}
        </svg>

        {/* Hover Anomaly Inspection Overlay */}
        <AnimatePresence>
          {hoveredAnomaly && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-3 left-4 right-4 bg-black/90 p-3 rounded-xl border border-rose-500/50 backdrop-blur-xl flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hoveredAnomaly.severity === 'CRITICAL'
                      ? 'bg-rose-500'
                      : hoveredAnomaly.severity === 'WARNING'
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                />
                <div>
                  <span className="font-bold text-white uppercase">{hoveredAnomaly.title}</span>
                  <span className="text-theme-muted ml-2">{hoveredAnomaly.description}</span>
                </div>
              </div>
              <div className="text-cyan-400 font-bold">
                {new Date(hoveredAnomaly.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
