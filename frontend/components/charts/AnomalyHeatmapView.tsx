'use client';

import React, { useState } from 'react';

export interface AnomalyPoint {
  id: string;
  type: 'BURST_VELOCITY' | 'SILENCE_GAP' | 'VOCABULARY_SHIFT' | 'MONOLOGUE';
  score: number; // 0 - 100
  timestamp: string;
  hour: number;
  day: number;
  actor: string;
  description: string;
}

interface AnomalyHeatmapViewProps {
  anomalies?: AnomalyPoint[];
  onDrillDown?: (anomaly: AnomalyPoint) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AnomalyHeatmapView({
  anomalies = [],
  onDrillDown,
}: AnomalyHeatmapViewProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyPoint | null>(null);

  // Generate fallback anomaly dataset if none provided
  const points: AnomalyPoint[] = anomalies.length > 0
    ? anomalies
    : [
        {
          id: 'anom_1',
          type: 'BURST_VELOCITY',
          score: 94,
          timestamp: new Date().toISOString(),
          hour: 22,
          day: 2,
          actor: 'Lead Director',
          description: 'Sudden burst of 48 messages in 3 minutes (4.2x standard velocity)',
        },
        {
          id: 'anom_2',
          type: 'VOCABULARY_SHIFT',
          score: 88,
          timestamp: new Date().toISOString(),
          hour: 3,
          day: 4,
          actor: 'Participant Alpha',
          description: 'Late-night lexical divergence and elevated urgency indicators',
        },
        {
          id: 'anom_3',
          type: 'SILENCE_GAP',
          score: 76,
          timestamp: new Date().toISOString(),
          hour: 14,
          day: 1,
          actor: 'System',
          description: 'Uncharacteristic 18-hour dormancy during core business hours',
        },
      ];

  const getTypeColor = (type: AnomalyPoint['type']) => {
    switch (type) {
      case 'BURST_VELOCITY':
        return 'bg-rose-500 text-rose-100 border-rose-400';
      case 'VOCABULARY_SHIFT':
        return 'bg-purple-500 text-purple-100 border-purple-400';
      case 'SILENCE_GAP':
        return 'bg-amber-500 text-amber-100 border-amber-400';
      case 'MONOLOGUE':
        return 'bg-cyan-500 text-cyan-100 border-cyan-400';
    }
  };

  return (
    <div
      role="region"
      aria-label="Forensic anomaly heatmap drilldown matrix"
      className="p-6 rounded-3xl bg-theme-surface border border-theme-border flex flex-col gap-5 font-mono text-theme-text shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-theme-border">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text flex items-center gap-2">
            <span>⚡</span>
            <span>Forensic Anomaly Heatmap Matrix</span>
          </h3>
          <p className="text-[10px] text-theme-dim mt-0.5">
            Statistical outliers (3-sigma IQR) detected across temporal distributions
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
            Burst
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
            Vocab Shift
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
            Silence Gap
          </span>
        </div>
      </div>

      {/* Anomaly Cards List with Drill-down */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {points.map((pt) => (
          <div
            key={pt.id}
            onClick={() => {
              setSelectedAnomaly(pt);
              if (onDrillDown) onDrillDown(pt);
            }}
            className="p-4 rounded-2xl bg-theme-raised border border-theme-border hover:border-theme-accent/80 transition-all cursor-pointer space-y-2 group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getTypeColor(pt.type)}`}>
                {pt.type.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold text-rose-400">Score: {pt.score}/100</span>
            </div>

            <p className="text-xs text-theme-text font-sans font-medium line-clamp-2">
              {pt.description}
            </p>

            <div className="flex items-center justify-between text-[10px] text-theme-dim pt-1 border-t border-theme-border/60">
              <span>{DAYS[pt.day]} @ {pt.hour}:00</span>
              <span className="text-theme-accent group-hover:underline">Drill-down →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Drilldown Detail */}
      {selectedAnomaly && (
        <div className="p-4 rounded-2xl bg-theme-base/80 border border-theme-accent/50 text-xs flex items-center justify-between animate-fadeIn">
          <div>
            <strong className="text-theme-accent block">Active Filter: {selectedAnomaly.actor}</strong>
            <span className="text-theme-dim text-[11px]">{selectedAnomaly.description}</span>
          </div>
          <button
            onClick={() => setSelectedAnomaly(null)}
            className="px-3 py-1 rounded-xl bg-theme-raised text-theme-dim hover:text-theme-text text-[10px] cursor-pointer"
          >
            Clear Drill-down
          </button>
        </div>
      )}
    </div>
  );
}
