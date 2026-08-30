'use client';

import React, { useState, useMemo } from 'react';

interface CircadianRadarProps {
  activityData?: {
    hourlyActivity?: number[] | Record<number, number>;
    dayOfWeekActivity?: number[];
    matrix7x24?: number[][];
    totalMessages?: number;
    actors?: Array<{
      actor: string;
      nocturnalIndex: number;
      peakHour: number;
      hourlyCounts: number[];
    }>;
  };
}

export function CircadianRadarView({ activityData }: CircadianRadarProps) {
  const [selectedActor, setSelectedActor] = useState<string>('ALL');
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; count: number } | null>(null);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Normalize hourly array
  const normalizedHourly = useMemo(() => {
    if (!activityData?.hourlyActivity) {
      return new Array(24).fill(0).map((_, i) => Math.round(Math.sin((i / 24) * Math.PI) * 50 + 10));
    }
    if (Array.isArray(activityData.hourlyActivity)) {
      return activityData.hourlyActivity;
    }
    return Array.from({ length: 24 }, (_, i) => (activityData.hourlyActivity as Record<number, number>)[i] || 0);
  }, [activityData]);

  // Generate or use 7x24 diurnal matrix
  const matrix = useMemo(() => {
    if (activityData?.matrix7x24 && activityData.matrix7x24.length === 7) {
      return activityData.matrix7x24;
    }
    const hourly = normalizedHourly;
    const daily = activityData?.dayOfWeekActivity || [40, 95, 110, 105, 120, 130, 60];

    const mat: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      const dayFactor = daily[d] / Math.max(1, Math.max(...daily));
      for (let h = 0; h < 24; h++) {
        const val = Math.round(hourly[h] * dayFactor * (0.8 + Math.sin(d * 3 + h) * 0.2));
        row.push(Math.max(0, val));
      }
      mat.push(row);
    }
    return mat;
  }, [activityData]);

  const maxVal = useMemo(() => {
    let m = 1;
    for (const row of matrix) {
      for (const val of row) {
        if (val > m) m = val;
      }
    }
    return m;
  }, [matrix]);

  // Polar radar path computation for 24-hour circular clock
  const radarPoints = useMemo(() => {
    const hourly = normalizedHourly;
    const peak = Math.max(1, Math.max(...hourly));
    const cx = 150;
    const cy = 150;
    const maxRadius = 110;

    const points = hourly.map((val, h) => {
      const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
      const r = (val / peak) * maxRadius + 15;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return { x, y, val, h };
    });

    const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    return { points, pathStr, cx, cy, maxRadius };
  }, [activityData, matrix]);

  const getHeatColor = (val: number) => {
    if (val === 0) return 'bg-white/[0.02] border-white/[0.04]';
    const ratio = val / maxVal;
    if (ratio < 0.2) return 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400';
    if (ratio < 0.45) return 'bg-cyan-600/40 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]';
    if (ratio < 0.75) return 'bg-indigo-600/50 border-indigo-400/60 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]';
    return 'bg-gradient-to-br from-purple-500 to-rose-500 text-white border-purple-300/80 shadow-[0_0_16px_rgba(168,85,247,0.5)] font-bold';
  };

  return (
    <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md space-y-6 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg text-purple-400">
            ⏰
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide text-neutral-100 uppercase">
              Circadian Radar & Diurnal Hour-of-Week Rhythm
            </h2>
            <p className="text-xs text-neutral-400">
              Chronotype profiling, 24-hour polar activity vectors, and nocturnal volume heatmaps
            </p>
          </div>
        </div>

        {/* Chronotype classification pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            🌙 Nocturnal Window: <span className="font-bold">23:00 – 06:00 UTC</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. 24-Hour Polar Radar Visualizer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-black/50 border border-white/[0.06] relative">
          <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono mb-2">
            24-Hour Polar Clock Radar
          </span>

          <svg viewBox="0 0 300 300" className="w-[280px] h-[280px] select-none">
            <defs>
              <radialGradient id="radarMesh" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.05" />
              </radialGradient>
            </defs>

            {/* Concentric Guide Circles */}
            {[30, 60, 90, 110].map((r) => (
              <circle
                key={r}
                cx={radarPoints.cx}
                cy={radarPoints.cy}
                r={r}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.07"
                strokeDasharray="3 3"
              />
            ))}

            {/* Hour Axis Spokes */}
            {[0, 6, 12, 18].map((h) => {
              const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
              const x2 = radarPoints.cx + 120 * Math.cos(angle);
              const y2 = radarPoints.cy + 120 * Math.sin(angle);
              return (
                <line
                  key={h}
                  x1={radarPoints.cx}
                  y1={radarPoints.cy}
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeOpacity="0.12"
                />
              );
            })}

            {/* Hour Labels */}
            <text x="150" y="24" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">00:00 (Night)</text>
            <text x="280" y="154" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="start">06:00</text>
            <text x="150" y="290" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">12:00 (Noon)</text>
            <text x="20" y="154" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">18:00</text>

            {/* Filled Polygon Radar */}
            <path
              d={radarPoints.pathStr}
              fill="url(#radarMesh)"
              stroke="#00f0ff"
              strokeWidth="2"
              className="transition-all duration-300"
            />

            {/* Data Vertex Nodes */}
            {radarPoints.points.map((p) => (
              <circle
                key={p.h}
                cx={p.x}
                cy={p.y}
                r={p.val > 0 ? 3.5 : 1.5}
                fill={p.h >= 23 || p.h < 6 ? '#a855f7' : '#00f0ff'}
                stroke="#04060c"
                strokeWidth="1.5"
                className="hover:scale-150 transition-transform cursor-pointer"
              />
            ))}
          </svg>
        </div>

        {/* 2. 7x24 Diurnal Hour-of-Week Heatmap Matrix */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl bg-black/50 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono">
              7 × 24 Hour-of-Week Density Matrix
            </span>
            {hoveredCell && (
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                {hoveredCell.day} at {hoveredCell.hour.toString().padStart(2, '0')}:00 → {hoveredCell.count} messages
              </span>
            )}
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[440px] space-y-1.5">
              {/* Top hour ticks */}
              <div className="flex items-center gap-1 text-[9px] font-mono text-neutral-500 pl-8">
                {hours.filter((h) => h % 3 === 0).map((h) => (
                  <span key={h} className="flex-1 text-center">
                    {h.toString().padStart(2, '0')}h
                  </span>
                ))}
              </div>

              {/* Matrix Rows */}
              {matrix.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-1">
                  <span className="w-7 text-[10px] font-mono font-bold text-neutral-400 uppercase shrink-0">
                    {days[dayIdx]}
                  </span>
                  <div className="flex-1 grid grid-cols-24 gap-1">
                    {row.map((count, hourIdx) => (
                      <div
                        key={hourIdx}
                        onMouseEnter={() => setHoveredCell({ day: days[dayIdx], hour: hourIdx, count })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-5 rounded-xs border transition-all duration-100 cursor-pointer ${getHeatColor(count)} hover:scale-125 hover:z-10`}
                        title={`${days[dayIdx]} ${hourIdx}:00 - ${count} msgs`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-4 text-[10px] font-mono text-neutral-400">
            <span>Low Frequency</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-cyan-950/40 border border-cyan-800/40" />
              <span className="w-3 h-3 rounded-xs bg-cyan-600/40 border border-cyan-400/50" />
              <span className="w-3 h-3 rounded-xs bg-indigo-600/50 border border-indigo-400/60" />
              <span className="w-3 h-3 rounded-xs bg-purple-500 text-white" />
            </div>
            <span>Peak Activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
