'use client';

import React, { useState, useEffect } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

interface OnThisDayViewProps {
  datasetId: string;
  apiUrl: string;
}

export function OnThisDayView({ datasetId, apiUrl }: OnThisDayViewProps) {
  const [streaks, setStreaks] = useState<any>(null);
  const [onThisDay, setOnThisDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Month (1-12) & Day (1-31)
  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [day, setDay] = useState(now.getUTCDate());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sRes, oRes] = await Promise.all([
          fetch(`${apiUrl}/datasets/${datasetId}/streaks`),
          fetch(`${apiUrl}/datasets/${datasetId}/on-this-day?month=${month}&day=${day}`),
        ]);

        if (sRes.ok) setStreaks(await sRes.json());
        if (oRes.ok) setOnThisDay(await oRes.json());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [datasetId, apiUrl, month, day]);

  return (
    <div className="flex flex-col gap-6">
      {/* Streak & Gap Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Longest Streak */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-theme-accent">🔥</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
              Longest Daily Streak
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-theme-highlight mt-1">
            <AnimatedCounter value={streaks?.longestStreak?.days || 0} /> Days
          </div>
          {streaks?.longestStreak?.startDate && (
            <p className="text-[11px] text-theme-dim mt-1">
              {new Date(streaks.longestStreak.startDate).toLocaleDateString()} &ndash;{' '}
              {new Date(streaks.longestStreak.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Longest Gap */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-theme-accent">⏳</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
              Longest Silence Gap
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text mt-1">
            <AnimatedCounter value={streaks?.longestGap?.days || 0} /> Days
          </div>
          {streaks?.longestGap?.startDate && (
            <p className="text-[11px] text-theme-dim mt-1">
              {new Date(streaks.longestGap.startDate).toLocaleDateString()} &ndash;{' '}
              {new Date(streaks.longestGap.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Active Days */}
        <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-theme-accent">📅</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
              Total Active Days
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-theme-highlight mt-1">
            <AnimatedCounter value={streaks?.totalActiveDays || 0} />
          </div>
          <p className="text-[11px] text-theme-dim mt-1">Total conversation calendar days</p>
        </div>
      </div>

      {/* On This Day Module */}
      <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-border pb-3 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-theme-accent">🕯</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                On This Day Memories
              </h3>
              <span className="text-[11px] text-theme-dim">
                Historical messages sent on {month}/{day} in previous years
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="bg-theme-base border border-theme-border text-theme-text rounded-theme px-2 py-1"
            >
              {[
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ].map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value, 10))}
              className="bg-theme-base border border-theme-border text-theme-text rounded-theme px-2 py-1"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-theme-muted">
            Searching Textboard memories...
          </div>
        ) : onThisDay?.events?.length === 0 ? (
          <div className="py-8 text-center text-xs text-theme-dim">
            No memories recorded on this calendar day in past years.
          </div>
        ) : (
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {onThisDay.events.map((ev: any) => (
              <div
                key={ev.id}
                className="bg-theme-base border border-theme-border p-3.5 rounded-theme"
              >
                <div className="flex items-center justify-between text-xs text-theme-dim mb-1.5">
                  <span className="font-bold text-theme-accent">{ev.actor || 'System'}</span>
                  <span>{new Date(ev.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-theme-text whitespace-pre-wrap leading-relaxed">
                  {ev.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
