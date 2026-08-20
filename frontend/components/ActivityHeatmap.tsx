'use client';

import React, { useState } from 'react';

interface ActivityHeatmapProps {
  data?: {
    byDayOfWeek?: Array<{ dayOfWeek: number; dayName: string; count: number; percentage: number }>;
    byHourOfDay?: Array<{ hour: number; count: number; percentage: number }>;
    matrix?: number[][]; // 7 days x 24 hours
  };
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    hour: number;
    count: number;
    percent: number;
  } | null>(null);

  // Generate or fallback 7x24 matrix based on available distributions
  const matrix = React.useMemo(() => {
    if (data?.matrix && data.matrix.length === 7) {
      return data.matrix;
    }

    // Synthesize realistic distribution from dayOfWeek + hourOfDay if 2D matrix not directly given
    const dayCounts = data?.byDayOfWeek?.map((d) => d.count) || [120, 140, 180, 160, 210, 250, 190];
    const hourCounts = data?.byHourOfDay?.map((h) => h.count) || Array(24).fill(10);
    const totalDay = dayCounts.reduce((a, b) => a + b, 0) || 1;
    const totalHour = hourCounts.reduce((a, b) => a + b, 0) || 1;

    const result: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let h = 0; h < 24; h++) {
        const val = Math.round((dayCounts[d] / totalDay) * (hourCounts[h] / totalHour) * 1000);
        row.push(val);
      }
      result.push(row);
    }
    return result;
  }, [data]);

  const maxVal = React.useMemo(() => {
    let max = 1;
    for (const row of matrix) {
      for (const val of row) {
        if (val > max) max = val;
      }
    }
    return max;
  }, [matrix]);

  const getCellColor = (val: number) => {
    if (val === 0) return 'bg-white/[0.03] border-white/[0.04]';
    const ratio = val / maxVal;
    if (ratio < 0.15) return 'bg-cyan-950/40 border-cyan-800/30 text-cyan-200/50';
    if (ratio < 0.35) return 'bg-cyan-800/50 border-cyan-600/40 text-cyan-200/80';
    if (ratio < 0.65) return 'bg-cyan-600/70 border-cyan-400/50 text-cyan-100';
    if (ratio < 0.85) return 'bg-cyan-500 border-cyan-300 text-black font-bold shadow-[0_0_8px_rgba(34,211,238,0.4)]';
    return 'bg-emerald-400 border-emerald-200 text-black font-bold shadow-[0_0_12px_rgba(52,211,153,0.7)]';
  };

  return (
    <div className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span>📅</span>
            <span>24/7 Peak Activity Matrix Heatmap</span>
          </h3>
          <p className="text-[11px] text-neutral-500">
            Hourly conversation velocity across days of the week
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <span>Low</span>
          <span className="w-3 h-3 rounded bg-white/[0.04] border border-white/[0.08]" />
          <span className="w-3 h-3 rounded bg-cyan-950/40 border border-cyan-800/30" />
          <span className="w-3 h-3 rounded bg-cyan-700/60 border border-cyan-500/40" />
          <span className="w-3 h-3 rounded bg-cyan-400 border border-cyan-300" />
          <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-200 shadow-xs" />
          <span>Peak</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[560px]">
          {/* Hour labels */}
          <div className="grid grid-cols-[36px_repeat(24,1fr)] gap-1 mb-1 text-[9px] text-neutral-500 text-center">
            <div />
            {HOURS.map((h) => (
              <div key={h} className={h % 3 === 0 ? 'text-neutral-400 font-bold' : 'opacity-40'}>
                {h % 3 === 0 ? `${h}h` : '•'}
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div className="space-y-1">
            {DAYS.map((dayName, dIdx) => (
              <div key={dayName} className="grid grid-cols-[36px_repeat(24,1fr)] gap-1 items-center">
                <span className="text-[10px] font-semibold text-neutral-400">{dayName}</span>
                {HOURS.map((h) => {
                  const val = matrix[dIdx]?.[h] || 0;
                  const percent = Math.round((val / maxVal) * 100);
                  const colorClass = getCellColor(val);

                  return (
                    <div
                      key={h}
                      onMouseEnter={() =>
                        setHoveredCell({
                          day: dayName,
                          hour: h,
                          count: val,
                          percent,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-5.5 rounded-sm border transition-all duration-150 cursor-pointer hover:scale-115 hover:z-20 ${colorClass}`}
                      title={`${dayName} @ ${h}:00 - Intensity: ${percent}%`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Hover Tooltip Bar */}
      <div className="h-6 flex items-center justify-between text-[11px] bg-white/[0.02] border border-white/[0.05] rounded px-3 text-neutral-400">
        {hoveredCell ? (
          <>
            <span className="text-cyan-300 font-semibold">
              {hoveredCell.day} at {hoveredCell.hour.toString().padStart(2, '0')}:00 - {(hoveredCell.hour + 1).toString().padStart(2, '0')}:00
            </span>
            <span>
              Activity Intensity:{' '}
              <strong className="text-emerald-400 font-bold">{hoveredCell.percent}% of peak</strong>
            </span>
          </>
        ) : (
          <span className="text-neutral-500 italic">
            Hover over any cell in the 24x7 matrix to inspect specific hourly velocity.
          </span>
        )}
      </div>
    </div>
  );
}
