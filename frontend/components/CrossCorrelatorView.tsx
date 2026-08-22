'use client';

import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  SmileIcon,
  FileTextIcon,
  RefreshCwIcon,
} from './Icons';
import { Button } from './ui/Button';
import CorrelationLissajousChart from './charts/CorrelationLissajousChart';

interface DatasetItem {
  id: string;
  name: string;
  totalEvents: number;
}

interface CrossCorrelatorViewProps {
  datasets: DatasetItem[];
}

export default function CrossCorrelatorView({ datasets }: CrossCorrelatorViewProps) {
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
      <div className="p-12 text-center font-mono text-xs text-theme-dim rounded-2xl glass-card-3d">
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
      <section className="glass-card-3d p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                CROSS-DATASET MULTI-STREAM CORRELATOR
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/40">
                V2.2 CORRELATION
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
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

        {/* Dual Stream Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stream A Card */}
          <div className="p-4 rounded-xl bg-black/40 border border-cyan-400/40 space-y-2">
            <span className="text-[10px] text-cyan-400 uppercase font-bold block">
              PRIMARY STREAM (A)
            </span>
            <select
              value={datasetIdA}
              onChange={(e) => setDatasetIdA(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                  {d.name} ({d.totalEvents.toLocaleString()} msgs)
                </option>
              ))}
            </select>
          </div>

          {/* Stream B Card */}
          <div className="p-4 rounded-xl bg-black/40 border border-rose-500/40 space-y-2">
            <span className="text-[10px] text-rose-400 uppercase font-bold block">
              COMPARISON STREAM (B)
            </span>
            <select
              value={datasetIdB}
              onChange={(e) => setDatasetIdB(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                  {d.name} ({d.totalEvents.toLocaleString()} msgs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 1. Dual-Stream Lissajous & Synchronicity Waveform Chart */}
      <CorrelationLissajousChart
        streamAName={dsA?.name || 'Stream A'}
        streamBName={dsB?.name || 'Stream B'}
        hourlyScheduleA={temporal?.hourlyScheduleA || []}
        hourlyScheduleB={temporal?.hourlyScheduleB || []}
        synchronicityScore={temporal?.synchronicityScore || 0.85}
        height={210}
      />

      {/* 2. Temporal & Behavioral Alignment Telemetry Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card-3d">
          <span className="text-[10px] text-theme-muted uppercase font-bold block">
            Overlap Duration
          </span>
          <span className="text-2xl font-bold text-cyan-300 mt-1 block">
            {temporal?.overlapDays || 0} <small className="text-xs font-normal text-theme-dim">days</small>
          </span>
          <span className="text-[10px] text-theme-dim mt-1 block">
            {temporal?.overlapPercentage?.toFixed(1) || 0}% temporal overlap
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card-3d">
          <span className="text-[10px] text-theme-muted uppercase font-bold block">
            Concurrent Dates
          </span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {temporal?.concurrentActiveDates || 0}
          </span>
          <span className="text-[10px] text-theme-dim mt-1 block">
            Simultaneous active days
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card-3d">
          <span className="text-[10px] text-theme-muted uppercase font-bold block">
            Schedule Synchronicity
          </span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">
            {((temporal?.synchronicityScore || 0) * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-theme-dim mt-1 block">
            Pearson hourly alignment
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card-3d">
          <span className="text-[10px] text-theme-muted uppercase font-bold block">
            Shared Vocabulary
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
            {lexical?.sharedWords?.length || 0} <small className="text-xs font-normal text-theme-dim">terms</small>
          </span>
          <span className="text-[10px] text-theme-dim mt-1 block">
            Common lexical terms
          </span>
        </div>
      </section>

      {/* 3. Lexical Diff Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shared Keywords */}
        <div className="glass-card-3d p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 border-b border-theme-border/50 pb-2">
            <FileTextIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Shared High-Frequency Words
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {lexical?.sharedWords?.length === 0 ? (
              <span className="text-xs text-theme-dim">No overlapping high-frequency terms.</span>
            ) : (
              lexical?.sharedWords?.map((w: string) => (
                <span
                  key={w}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-400/40"
                >
                  #{w}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Unique to Stream A */}
        <div className="glass-card-3d p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 border-b border-theme-border/50 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Unique to {dsA?.name || 'Stream A'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {lexical?.uniqueWordsA?.slice(0, 15).map((w: string) => (
              <span
                key={w}
                className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-mono border border-cyan-400/40"
              >
                #{w}
              </span>
            ))}
          </div>
        </div>

        {/* Unique to Stream B */}
        <div className="glass-card-3d p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 border-b border-theme-border/50 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Unique to {dsB?.name || 'Stream B'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {lexical?.uniqueWordsB?.slice(0, 15).map((w: string) => (
              <span
                key={w}
                className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-mono border border-rose-500/40"
              >
                #{w}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Participant Volume Overlap Table */}
      <section className="glass-card-3d p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-theme-border/50 pb-3">
          <UsersIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Cross-Stream Actor Volume Mapping ({participants.length} matches)
          </h3>
        </div>

        {participants.length === 0 ? (
          <div className="p-8 text-center text-xs text-theme-dim">
            No cross-stream participant identities matched.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-theme-border/50 text-theme-muted">
                  <th className="pb-2">Actor Identity</th>
                  <th className="pb-2 text-cyan-400">{dsA?.name || 'Stream A'} Msgs</th>
                  <th className="pb-2 text-rose-400">{dsB?.name || 'Stream B'} Msgs</th>
                  <th className="pb-2">Total Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/30">
                {participants.map((p: any) => (
                  <tr key={p.name} className="hover:bg-theme-surface-active/50">
                    <td className="py-2.5 font-bold text-white">{p.name}</td>
                    <td className="py-2.5 text-cyan-300">{p.countA.toLocaleString()}</td>
                    <td className="py-2.5 text-rose-300">{p.countB.toLocaleString()}</td>
                    <td className="py-2.5 font-bold text-white">
                      {(p.countA + p.countB).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
export { CrossCorrelatorView };
