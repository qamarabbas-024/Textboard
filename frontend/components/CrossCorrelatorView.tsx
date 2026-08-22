'use client';

import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  ActivityIcon,
  SmileIcon,
  FileTextIcon,
  RefreshCwIcon,
  LinkIcon,
} from './Icons';
import { Button } from './ui/Button';

interface DatasetItem {
  id: string;
  name: string;
  totalEvents: number;
}

interface CrossCorrelatorViewProps {
  datasets: DatasetItem[];
}

export function CrossCorrelatorView({ datasets }: CrossCorrelatorViewProps) {
  const [datasetIdA, setDatasetIdA] = useState<string>(datasets[0]?.id || '');
  const [datasetIdB, setDatasetIdB] = useState<string>(datasets[1]?.id || datasets[0]?.id || '');
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCorrelation = async () => {
    if (!datasetIdA || !datasetIdB) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/analytics/correlate/compare?datasetA=${datasetIdA}&datasetB=${datasetIdB}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCorrelationData(data);
      }
    } catch (err) {
      console.error('Correlation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (datasets.length >= 2) {
      if (!datasetIdA) setDatasetIdA(datasets[0].id);
      if (!datasetIdB) setDatasetIdB(datasets[1].id);
    }
  }, [datasets]);

  useEffect(() => {
    if (datasetIdA && datasetIdB) {
      fetchCorrelation();
    }
  }, [datasetIdA, datasetIdB]);

  if (datasets.length < 2) {
    return (
      <div className="p-12 text-center font-mono text-xs text-theme-dim rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        Multi-stream correlation requires at least 2 datasets. Ingest an additional communication stream in the Data tab to compare.
      </div>
    );
  }

  const dsA = correlationData?.datasetA;
  const dsB = correlationData?.datasetB;
  const temporal = correlationData?.temporalCorrelation;
  const lexical = correlationData?.lexicalCorrelation;
  const participants = correlationData?.participantOverlap || [];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Dataset Selectors */}
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">
                CROSS-DATASET MULTI-STREAM CORRELATOR
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-theme-accent text-[10px] font-bold border border-theme-border-hi">
                V2.2 CORRELATION
              </span>
            </div>
            <p className="text-xs text-theme-dim mt-0.5">
              Side-by-side comparative analysis of timeline overlaps, behavioral synchronicity, and lexical diffs
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchCorrelation}
            isLoading={isLoading}
            leftIcon={<RefreshCwIcon className="w-3.5 h-3.5" />}
          >
            Re-correlate
          </Button>
        </div>

        {/* Stream Selector Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-theme-base border border-theme-border space-y-2">
            <span className="text-[10px] text-theme-accent uppercase font-bold block">
              STREAM A (PRIMARY REFERENCE)
            </span>
            <select
              value={datasetIdA}
              onChange={(e) => setDatasetIdA(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text font-semibold focus:outline-none focus:border-theme-accent"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalEvents.toLocaleString()} records)
                </option>
              ))}
            </select>
            {dsA && (
              <div className="text-[11px] text-theme-dim flex justify-between pt-1">
                <span>Type: {dsA.sourceType.toUpperCase()}</span>
                <span>{dsA.totalEvents.toLocaleString()} total messages</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-theme-base border border-theme-border space-y-2">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">
              STREAM B (COMPARISON TARGET)
            </span>
            <select
              value={datasetIdB}
              onChange={(e) => setDatasetIdB(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text font-semibold focus:outline-none focus:border-theme-accent"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalEvents.toLocaleString()} records)
                </option>
              ))}
            </select>
            {dsB && (
              <div className="text-[11px] text-theme-dim flex justify-between pt-1">
                <span>Type: {dsB.sourceType.toUpperCase()}</span>
                <span>{dsB.totalEvents.toLocaleString()} total messages</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Correlation Telemetry KPI Grid */}
      {temporal && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
            <span className="text-[10px] text-theme-dim block uppercase font-semibold">Temporal Overlap</span>
            <span className="text-2xl font-bold text-theme-accent mt-1 block">
              {temporal.overlapDays} Days
            </span>
            <span className="text-[10px] text-theme-dim mt-0.5 block">
              {temporal.overlapPercentage}% duration overlap
            </span>
          </div>

          <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
            <span className="text-[10px] text-theme-dim block uppercase font-semibold">Concurrent Active Days</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {temporal.concurrentActiveDays} Days
            </span>
            <span className="text-[10px] text-theme-dim mt-0.5 block">
              Both channels active on same dates
            </span>
          </div>

          <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
            <span className="text-[10px] text-theme-dim block uppercase font-semibold">Hourly Synchronicity</span>
            <span className="text-2xl font-bold text-theme-text mt-1 block">
              {temporal.hourlySynchronicity > 0 ? `+${temporal.hourlySynchronicity}` : temporal.hourlySynchronicity}
            </span>
            <span className="text-[10px] text-theme-dim mt-0.5 block">
              {temporal.hourlySynchronicity >= 0.7
                ? 'High Schedule Alignment'
                : temporal.hourlySynchronicity >= 0.4
                ? 'Moderate Schedule Match'
                : 'Independent Time Patterns'}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
            <span className="text-[10px] text-theme-dim block uppercase font-semibold">Matched Participants</span>
            <span className="text-2xl font-bold text-purple-400 mt-1 block">
              {participants.length}
            </span>
            <span className="text-[10px] text-theme-dim mt-0.5 block">
              Shared cross-platform identities
            </span>
          </div>
        </section>
      )}

      {/* Lexical Comparison Diff Grid */}
      {lexical && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shared vs Distinct Vocabulary */}
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider flex items-center gap-2">
              <FileTextIcon className="w-4 h-4 text-theme-accent" />
              <span>SHARED HIGH-FREQUENCY VOCABULARY</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {lexical.sharedKeywords.slice(0, 25).map((w: any) => (
                <span
                  key={w.word}
                  className="px-2.5 py-1 rounded-lg bg-theme-base border border-theme-border text-xs text-theme-text"
                >
                  {w.word}{' '}
                  <span className="text-theme-dim text-[10px]">
                    (A: {w.countA} | B: {w.countB})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Shared Emojis */}
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
            <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider flex items-center gap-2">
              <SmileIcon className="w-4 h-4 text-theme-accent" />
              <span>SHARED EMOJI EXPRESSIONS</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {lexical.sharedEmojis.map((e: any) => (
                <div
                  key={e.emoji}
                  className="p-2.5 rounded-lg bg-theme-base border border-theme-border text-center"
                >
                  <div className="text-2xl mb-1">{e.emoji}</div>
                  <div className="text-[10px] text-theme-dim">
                    A: <strong className="text-theme-text">{e.countA}</strong> | B: <strong className="text-theme-text">{e.countB}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Participant Overlap Table */}
      {participants.length > 0 && (
        <section className="p-5 rounded-xl border border-theme-border bg-theme-surface space-y-4 shadow-xs">
          <h3 className="text-xs font-semibold text-theme-text uppercase tracking-wider flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-theme-accent" />
            <span>CROSS-STREAM PARTICIPANT OVERLAP ({participants.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-theme-border text-theme-muted text-[11px]">
                  <th className="py-2.5 px-3">PARTICIPANT</th>
                  <th className="py-2.5 px-3">STREAM A VOLUME</th>
                  <th className="py-2.5 px-3">STREAM B VOLUME</th>
                  <th className="py-2.5 px-3">COMBINED TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {participants.map((p: any) => (
                  <tr key={p.name} className="hover:bg-theme-raised transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-theme-text">{p.name}</td>
                    <td className="py-2.5 px-3 text-theme-accent">{p.messageCountA.toLocaleString()} msgs</td>
                    <td className="py-2.5 px-3 text-emerald-400">{p.messageCountB.toLocaleString()} msgs</td>
                    <td className="py-2.5 px-3 font-bold text-theme-text">
                      {(p.messageCountA + p.messageCountB).toLocaleString()} msgs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
