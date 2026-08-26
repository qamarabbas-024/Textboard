'use client';

import React, { useState } from 'react';

export interface SentimentHeatmapCell {
  day: number; // 0 = Sun, 6 = Sat
  hour: number; // 0 - 23
  sentimentScore: number; // -1.0 (tense/negative) to +1.0 (positive/joyful)
  messageCount: number;
}

export interface SentimentHeatmapChartProps {
  data?: SentimentHeatmapCell[];
  title?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SentimentHeatmapChart({
  data = [],
  title = '24-Hour Diurnal Sentiment Heatmap',
}: SentimentHeatmapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<SentimentHeatmapCell | null>(null);

  // Generate fallback data if empty
  const matrix: SentimentHeatmapCell[] = data.length > 0
    ? data
    : Array.from({ length: 7 * 24 }, (_, i) => {
        const day = Math.floor(i / 24);
        const hour = i % 24;
        const score = Math.sin(hour / 3) * 0.6 + (Math.random() - 0.5) * 0.3;
        const count = Math.floor(Math.abs(Math.cos(hour / 4)) * 40 + Math.random() * 10);
        return { day, hour, sentimentScore: Number(score.toFixed(2)), messageCount: count };
      });

  const getCellColor = (score: number, count: number) => {
    if (count === 0) return 'rgba(255, 255, 255, 0.03)';
    if (score > 0.3) return `rgba(52, 211, 153, ${Math.min(0.9, 0.2 + (score * 0.7))})`; // Emerald positive
    if (score < -0.2) return `rgba(244, 63, 94, ${Math.min(0.9, 0.2 + (Math.abs(score) * 0.7))})`; // Rose negative/urgent
    return `rgba(56, 189, 248, ${Math.min(0.8, 0.2 + (count / 50) * 0.5)})`; // Cyan neutral
  };

  return (
    <div
      role="region"
      aria-label={title}
      className="p-5 rounded-3xl bg-theme-surface border border-theme-border flex flex-col gap-4 font-mono text-theme-text shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text flex items-center gap-2">
            <span>🌡️</span>
            <span>{title}</span>
          </h3>
          <p className="text-[10px] text-theme-dim mt-0.5">
            Diurnal 7-day emotional polarity and interaction tone distribution
          </p>
        </div>

        {/* Sentiment Legend */}
        <div className="flex items-center gap-3 text-[10px] text-theme-dim">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/80" />
            <span>Tense / Escalated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500/60" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/80" />
            <span>Positive / Agreeable</span>
          </div>
        </div>
      </div>

      {/* Grid Canvas Matrix */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px] flex flex-col gap-1.5">
          {/* Hours Header */}
          <div className="flex items-center gap-1 pl-12 text-[9px] text-theme-dim">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center font-bold">
                {h % 3 === 0 ? `${h}h` : ''}
              </div>
            ))}
          </div>

          {/* 7 Days Rows */}
          {DAYS.map((dayName, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1">
              <span className="w-11 text-[10px] font-bold text-theme-dim text-right pr-2">
                {dayName}
              </span>
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = matrix.find((c) => c.day === dayIdx && c.hour === h) || {
                    day: dayIdx,
                    hour: h,
                    sentimentScore: 0,
                    messageCount: 0,
                  };

                  return (
                    <div
                      key={h}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ backgroundColor: getCellColor(cell.sentimentScore, cell.messageCount) }}
                      className="flex-1 h-6 rounded-xs border border-white/[0.04] transition-all hover:scale-110 hover:border-theme-border-hi cursor-pointer relative"
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip Bar */}
      <div className="min-h-[28px] p-2 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-between text-xs text-theme-dim">
        {hoveredCell ? (
          <>
            <span className="font-bold text-theme-accent">
              {DAYS[hoveredCell.day]} @ {hoveredCell.hour}:00
            </span>
            <span>
              Volume: <strong className="text-theme-text">{hoveredCell.messageCount} msgs</strong>
            </span>
            <span>
              Polarity Score: <strong className="text-theme-text">{hoveredCell.sentimentScore > 0 ? `+${hoveredCell.sentimentScore}` : hoveredCell.sentimentScore}</strong>
            </span>
          </>
        ) : (
          <span className="text-[11px] text-theme-dim mx-auto">
            Hover over any diurnal cell to inspect detailed emotional polarity metrics
          </span>
        )}
      </div>
    </div>
  );
}
