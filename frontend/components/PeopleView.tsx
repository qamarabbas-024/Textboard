'use client';

import React, { useState, useEffect } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

interface PersonStat {
  actor: string;
  messageCount: number;
  totalChars: number;
  avgCharsPerMessage: number;
  avgResponseSecs: number | null;
  medianResponseSecs: number | null;
  firstActive: string;
  lastActive: string;
  hourly: number[];
  daily: number[];
}

interface PeopleViewProps {
  datasetId: string;
  apiUrl: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PeopleView({ datasetId, apiUrl }: PeopleViewProps) {
  const [data, setData] = useState<{ totalParticipants: number; people: PersonStat[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<PersonStat | null>(null);

  useEffect(() => {
    async function loadPeople() {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/datasets/${datasetId}/people`);
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
          if (resData.people.length > 0) {
            setSelectedPerson(resData.people[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load people stats', e);
      } finally {
        setLoading(false);
      }
    }
    loadPeople();
  }, [datasetId, apiUrl]);

  if (loading || !data) {
    return (
      <div className="py-16 text-center text-xs text-theme-muted">
        Analyzing participant patterns &amp; response latencies...
      </div>
    );
  }

  const maxDaily = Math.max(1, ...(selectedPerson?.daily || [1]));
  const maxHourly = Math.max(1, ...(selectedPerson?.hourly || [1]));

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-theme-border bg-theme-surface rounded-theme p-4">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
            Total Participants
          </span>
          <div className="text-2xl font-bold font-mono text-theme-accent mt-1">
            <AnimatedCounter value={data.totalParticipants} />
          </div>
        </div>

        <div className="border border-theme-border bg-theme-surface rounded-theme p-4">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
            Most Active Participant
          </span>
          <div className="text-lg font-bold text-theme-text mt-1 truncate">
            {data.people[0]?.actor || 'None'}
          </div>
          <span className="text-xs text-theme-muted">
            {data.people[0]?.messageCount.toLocaleString()} messages
          </span>
        </div>

        <div className="border border-theme-border bg-theme-surface rounded-theme p-4">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-dim">
            Fastest Responder
          </span>
          {(() => {
            const responders = data.people.filter((p) => p.avgResponseSecs !== null);
            responders.sort((a, b) => (a.avgResponseSecs || 999999) - (b.avgResponseSecs || 999999));
            const fastest = responders[0];
            return fastest ? (
              <div>
                <div className="text-lg font-bold text-theme-accent mt-1 truncate">
                  {fastest.actor}
                </div>
                <span className="text-xs text-theme-muted">
                  ~{Math.round(fastest.avgResponseSecs! / 60)} mins avg latency
                </span>
              </div>
            ) : (
              <div className="text-sm text-theme-dim mt-1">N/A</div>
            );
          })()}
        </div>
      </div>

      {/* Participants Table & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Participants List */}
        <div className="lg:col-span-6 border border-theme-border bg-theme-surface rounded-theme overflow-hidden terminal-interactive shadow-sm">
          <div className="px-4 py-3 bg-theme-raised border-b border-theme-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Participant Overview
            </h3>
            <span className="text-[11px] text-theme-dim">Click to view breakdown</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-theme-border">
            {data.people.map((p) => {
              const isSelected = selectedPerson?.actor === p.actor;
              return (
                <button
                  key={p.actor}
                  onClick={() => setSelectedPerson(p)}
                  className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-theme-active border-l-2 border-theme-border-hi' : 'hover:bg-theme-raised'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-theme-text">{p.actor}</div>
                    <div className="text-[10px] text-theme-dim mt-0.5">
                      Avg response: {p.avgResponseSecs ? `${Math.round(p.avgResponseSecs / 60)}m` : 'N/A'} &bull; Avg msg: {p.avgCharsPerMessage} chars
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-theme-accent">
                      {p.messageCount.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-theme-dim">msgs</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Person Detailed Activity Breakdown */}
        <div className="lg:col-span-6 border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm flex flex-col justify-between">
          {selectedPerson ? (
            <div>
              <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-theme-text">{selectedPerson.actor}</h3>
                  <span className="text-[11px] text-theme-dim">Activity &amp; Timing Patterns</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-theme-accent font-bold">
                    {selectedPerson.messageCount.toLocaleString()} messages
                  </span>
                </div>
              </div>

              {/* Day of Week Distribution */}
              <div className="mb-5">
                <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider block mb-2">
                  Active Days of Week
                </span>
                <div className="flex items-end gap-1.5 h-20 pt-2 border-b border-theme-border pb-1">
                  {selectedPerson.daily.map((count, i) => {
                    const pct = Math.max(8, (count / maxDaily) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full bg-theme-raised hover:bg-theme-accent border border-theme-border rounded-t-sm transition-all"
                          title={`${DAYS[i]}: ${count.toLocaleString()} messages`}
                        />
                        <span className="text-[10px] text-theme-dim mt-1">{DAYS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly Distribution (0-23) */}
              <div>
                <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider block mb-2">
                  Active Hours of Day (00:00 - 23:00 UTC)
                </span>
                <div className="flex items-end gap-0.5 h-20 pt-2 border-b border-theme-border pb-1">
                  {selectedPerson.hourly.map((count, hour) => {
                    const pct = Math.max(8, (count / maxHourly) * 100);
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full bg-theme-raised group-hover:bg-theme-accent border border-theme-border/40 rounded-t-sm transition-all"
                          title={`${hour}:00 - ${count.toLocaleString()} messages`}
                        />
                        {hour % 4 === 0 && (
                          <span className="text-[8px] text-theme-dim mt-1">{hour}h</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-theme-dim">Select a participant to view breakdown.</p>
          )}
        </div>
      </div>
    </div>
  );
}
