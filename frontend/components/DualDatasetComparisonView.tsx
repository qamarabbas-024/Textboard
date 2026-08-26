'use client';

import React, { useState, useEffect } from 'react';

export interface DatasetSummary {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
}

export function DualDatasetComparisonView() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetAId, setDatasetAId] = useState<string>('');
  const [datasetBId, setDatasetBId] = useState<string>('');
  const [correlationData, setCorrelationData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/datasets')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.datasets || [];
        setDatasets(list);
        if (list.length >= 2) {
          setDatasetAId(list[0].id);
          setDatasetBId(list[1].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!datasetAId || !datasetBId || datasetAId === datasetBId) return;

    setIsLoading(true);
    fetch(`/api/v1/analytics/correlate?datasetA=${datasetAId}&datasetB=${datasetBId}`)
      .then((res) => res.json())
      .then((data) => setCorrelationData(data))
      .catch((err) => console.error('Correlation fetch failed:', err))
      .finally(() => setIsLoading(false));
  }, [datasetAId, datasetBId]);

  return (
    <div
      role="region"
      aria-label="Dual dataset comparative intelligence workstation"
      className="p-6 rounded-3xl bg-theme-surface border border-theme-border flex flex-col gap-6 font-mono text-theme-text shadow-2xl"
    >
      {/* Header & Dataset Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-theme-border">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-theme-text flex items-center gap-2">
            <span>⚖️</span>
            <span>Dual-Stream Cross-Dataset Comparison</span>
          </h2>
          <p className="text-xs text-theme-dim mt-0.5">
            Synchronized timeline alignment, participant co-occurrence, and lexical overlap
          </p>
        </div>

        {/* Dataset Selectors */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={datasetAId}
            onChange={(e) => setDatasetAId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-theme-base border border-cyan-500/40 text-cyan-300 font-bold outline-none cursor-pointer"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                Stream A: {d.name} ({d.totalEvents || 0})
              </option>
            ))}
          </select>

          <span className="text-theme-dim font-bold">VS</span>

          <select
            value={datasetBId}
            onChange={(e) => setDatasetBId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-theme-base border border-emerald-500/40 text-emerald-300 font-bold outline-none cursor-pointer"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                Stream B: {d.name} ({d.totalEvents || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-theme-accent animate-pulse">
          Aligning temporal distributions &amp; computing cross-correlation...
        </div>
      ) : correlationData ? (
        <div className="space-y-6">
          {/* Synchronicity KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-theme-raised border border-theme-border">
              <span className="text-[10px] text-theme-dim uppercase font-bold block">Temporal Overlap</span>
              <strong className="text-base text-cyan-400 font-bold mt-1 block">
                {correlationData.temporalCorrelation?.overlapDays || 0} Days
              </strong>
              <span className="text-[10px] text-theme-dim">
                {correlationData.temporalCorrelation?.overlapPercentage || 0}% concurrent span
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-theme-raised border border-theme-border">
              <span className="text-[10px] text-theme-dim uppercase font-bold block">Hourly Synchronicity</span>
              <strong className="text-base text-emerald-400 font-bold mt-1 block">
                {correlationData.temporalCorrelation?.hourlySynchronicity || 0}
              </strong>
              <span className="text-[10px] text-theme-dim">Pearson diurnal score (-1 to +1)</span>
            </div>

            <div className="p-4 rounded-2xl bg-theme-raised border border-theme-border">
              <span className="text-[10px] text-theme-dim uppercase font-bold block">Shared Vocabulary</span>
              <strong className="text-base text-purple-400 font-bold mt-1 block">
                {correlationData.lexicalCorrelation?.sharedKeywords?.length || 0} Keywords
              </strong>
              <span className="text-[10px] text-theme-dim">Shared topical terms</span>
            </div>

            <div className="p-4 rounded-2xl bg-theme-raised border border-theme-border">
              <span className="text-[10px] text-theme-dim uppercase font-bold block">Participant Overlap</span>
              <strong className="text-base text-amber-400 font-bold mt-1 block">
                {correlationData.participantOverlap?.length || 0} Common
              </strong>
              <span className="text-[10px] text-theme-dim">Cross-channel actors</span>
            </div>
          </div>

          {/* Shared Keywords Cloud */}
          {correlationData.lexicalCorrelation?.sharedKeywords?.length > 0 && (
            <div className="p-4 rounded-2xl bg-theme-raised border border-theme-border space-y-2">
              <h4 className="text-xs font-bold uppercase text-theme-text">Shared Keywords &amp; Vocabulary</h4>
              <div className="flex flex-wrap gap-1.5">
                {correlationData.lexicalCorrelation.sharedKeywords.slice(0, 24).map((kw: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-lg bg-theme-surface border border-theme-border text-[11px] text-theme-text"
                  >
                    {kw.word} <span className="text-theme-dim font-bold text-[9px]">(A:{kw.countA} / B:{kw.countB})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-theme-dim">
          Select two distinct communication datasets above to perform real-time cross-correlation.
        </div>
      )}
    </div>
  );
}
