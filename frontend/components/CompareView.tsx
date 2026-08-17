'use client';

import React, { useState, useEffect } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

interface CompareViewProps {
  datasetId: string;
  apiUrl: string;
}

export function CompareView({ datasetId, apiUrl }: CompareViewProps) {
  const [actors, setActors] = useState<string[]>([]);
  const [actorA, setActorA] = useState<string>('');
  const [actorB, setActorB] = useState<string>('');
  const [data, setData] = useState<{ actorA: any; actorB: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadActors() {
      try {
        const res = await fetch(`${apiUrl}/datasets/${datasetId}/people`);
        if (res.ok) {
          const pData = await res.json();
          const list = pData.people.map((p: any) => p.actor);
          setActors(list);
          if (list.length >= 2) {
            setActorA(list[0]);
            setActorB(list[1]);
          } else if (list.length === 1) {
            setActorA(list[0]);
            setActorB(list[0]);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadActors();
  }, [datasetId, apiUrl]);

  useEffect(() => {
    if (!actorA || !actorB) return;
    async function fetchComparison() {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/datasets/${datasetId}/compare?actorA=${encodeURIComponent(actorA)}&actorB=${encodeURIComponent(actorB)}`,
        );
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [datasetId, apiUrl, actorA, actorB]);

  const statA = data?.actorA;
  const statB = data?.actorB;

  return (
    <div className="flex flex-col gap-6">
      {/* Selector Toolbar */}
      <div className="border border-theme-border bg-theme-surface rounded-theme p-5 terminal-interactive shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-theme-dim uppercase tracking-wider block mb-1">
              Participant 1
            </label>
            <select
              value={actorA}
              onChange={(e) => setActorA(e.target.value)}
              className="w-full bg-theme-base border border-theme-border text-theme-text rounded-theme px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-theme-border-hi"
            >
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <span className="text-theme-accent font-bold text-base mt-4">VS</span>

          <div className="flex-1">
            <label className="text-[11px] font-bold text-theme-dim uppercase tracking-wider block mb-1">
              Participant 2
            </label>
            <select
              value={actorB}
              onChange={(e) => setActorB(e.target.value)}
              className="w-full bg-theme-base border border-theme-border text-theme-text rounded-theme px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-theme-border-hi"
            >
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center text-xs text-theme-muted">
          Computing comparison metrics...
        </div>
      ) : statA && statB ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A */}
          <div className="border border-theme-border bg-theme-surface rounded-theme p-6 terminal-interactive shadow-sm">
            <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-4">
              <h3 className="text-base font-bold text-theme-accent">{statA.actor}</h3>
              <span className="text-xs font-mono font-bold text-theme-text">
                <AnimatedCounter value={statA.messageCount} /> msgs
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Total Characters Sent</span>
                <span className="font-mono text-theme-text font-semibold">
                  <AnimatedCounter value={statA.totalChars} />
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Average Length / Message</span>
                <span className="font-mono text-theme-text font-semibold">
                  {statA.avgCharsPerMessage} chars
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Average Response Time</span>
                <span className="font-mono text-theme-accent font-semibold">
                  {statA.avgResponseSecs ? `${Math.round(statA.avgResponseSecs / 60)} mins` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">First Active</span>
                <span className="text-theme-dim">
                  {new Date(statA.firstActive).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className="border border-theme-border bg-theme-surface rounded-theme p-6 terminal-interactive shadow-sm">
            <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-4">
              <h3 className="text-base font-bold text-theme-accent">{statB.actor}</h3>
              <span className="text-xs font-mono font-bold text-theme-text">
                <AnimatedCounter value={statB.messageCount} /> msgs
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Total Characters Sent</span>
                <span className="font-mono text-theme-text font-semibold">
                  <AnimatedCounter value={statB.totalChars} />
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Average Length / Message</span>
                <span className="font-mono text-theme-text font-semibold">
                  {statB.avgCharsPerMessage} chars
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">Average Response Time</span>
                <span className="font-mono text-theme-accent font-semibold">
                  {statB.avgResponseSecs ? `${Math.round(statB.avgResponseSecs / 60)} mins` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-theme-border/50">
                <span className="text-theme-muted">First Active</span>
                <span className="text-theme-dim">
                  {new Date(statB.firstActive).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
