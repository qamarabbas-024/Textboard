'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircleIcon,
  RefreshCwIcon,
} from './Icons';
import { Button } from './ui/Button';
import AnomalyPulseChart from './charts/AnomalyPulseChart';

export interface ForensicAnomaly {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'NOTE';
  title: string;
  description: string;
  timestamp: string;
  endTimestamp?: string;
  actor?: string;
  metrics: {
    value: number;
    baseline: number;
    ratio: number;
    unit: string;
  };
  sampleSnippet?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyReport {
  datasetId: string;
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  noteCount: number;
  anomalies: ForensicAnomaly[];
  computedAt: string;
}

interface AnomalyViewProps {
  datasetId: string;
  datasetName?: string;
  onExploreDate?: (date: string) => void;
}

export function AnomalyView({ datasetId, datasetName, onExploreDate }: AnomalyViewProps) {
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchAnomalies = async () => {
    if (!datasetId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/${datasetId}/anomalies`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [datasetId]);

  const anomalies = report?.anomalies || [];

  const filtered = anomalies.filter((a) => {
    const typeMatch = selectedType === 'ALL' || a.type === selectedType;
    const sevMatch = selectedSeverity === 'ALL' || a.severity === selectedSeverity;
    return typeMatch && sevMatch;
  });

  const types = [
    { key: 'ALL', label: 'ALL TYPES' },
    { key: 'LATE_NIGHT_SURGE', label: '🌙 LATE NIGHT' },
    { key: 'VELOCITY_BURST', label: '⚡ VELOCITY BURST' },
    { key: 'EXTENDED_DORMANCY', label: '⏸️ SILENCE GAPS' },
    { key: 'URGENCY_SPIKE', label: '🚨 URGENCY / RISKS' },
    { key: 'GHOST_PARTICIPANT', label: '👻 GHOST CONTACTS' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Metric Banner */}
      <section className="glass-card-3d p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
              <AlertCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  FORENSIC PATTERN &amp; ANOMALY DETECTOR
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/40">
                  V2.1 ENGINE
                </span>
              </div>
              <p className="text-xs text-theme-muted mt-0.5">
                Automated statistical anomaly detection for bursts, late-night spikes, dormancy, and ghosting
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAnomalies}
            isLoading={isLoading}
            leftIcon={<RefreshCwIcon className="w-3.5 h-3.5" />}
          >
            Re-scan Stream
          </Button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-black/40 border border-theme-border/60">
            <span className="text-[10px] text-theme-muted block uppercase font-semibold">Total Anomalies</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {report?.totalAnomalies || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-rose-500/40">
            <span className="text-[10px] text-rose-400 block uppercase font-semibold">Critical Alerts</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">
              {report?.criticalCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/40">
            <span className="text-[10px] text-amber-400 block uppercase font-semibold">Warnings</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {report?.warningCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/40">
            <span className="text-[10px] text-cyan-400 block uppercase font-semibold">Noteworthy Events</span>
            <span className="text-2xl font-bold text-cyan-400 mt-1 block">
              {report?.noteCount || 0}
            </span>
          </div>
        </div>
      </section>

      {/* 1. Oscilloscope Real-Time Waveform Chart */}
      <AnomalyPulseChart
        anomalies={anomalies}
        title="Forensic Threat & Anomaly Radar Oscilloscope"
        subtitle="Real-time timeline pulse and severity tripwire spikes"
        height={190}
      />

      {/* Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card-3d p-3 rounded-2xl text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {types.map((t) => {
            const isActive = selectedType === t.key;
            return (
              <Button
                key={t.key}
                variant={isActive ? 'accent-outline' : 'ghost'}
                size="xs"
                onClick={() => setSelectedType(t.key)}
              >
                {t.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-theme-dim mr-1">SEVERITY:</span>
          {['ALL', 'CRITICAL', 'WARNING', 'NOTE'].map((sev) => {
            const isActive = selectedSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? sev === 'CRITICAL'
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm'
                      : sev === 'WARNING'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                    : 'bg-theme-surface text-theme-muted hover:text-white border border-theme-border/60'
                }`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Anomalies List */}
      <section className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl glass-card-3d text-center text-xs text-theme-dim">
            {isLoading ? 'Scanning communication stream for forensic patterns...' : 'No forensic anomalies detected matching the active filters.'}
          </div>
        ) : (
          filtered.map((anomaly) => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isWarning = anomaly.severity === 'WARNING';

            const badgeColor = isCritical
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              : isWarning
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';

            return (
              <div
                key={anomaly.id}
                className="p-5 rounded-2xl glass-card-3d flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase ${badgeColor}`}>
                      {anomaly.severity}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {anomaly.title}
                    </span>
                    <span className="text-[11px] text-theme-dim font-mono">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-theme-muted font-sans leading-relaxed">
                    {anomaly.description}
                  </p>

                  {/* Snippet / Context */}
                  {anomaly.sampleSnippet && (
                    <div className="p-2.5 rounded-xl bg-black/60 border border-theme-border/60 text-xs text-theme-text font-mono italic">
                      &ldquo;{anomaly.sampleSnippet}&rdquo;
                    </div>
                  )}
                </div>

                {/* Metric Telemetry & Action Button */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-cyan-300 font-mono">
                      {anomaly.metrics.ratio.toFixed(1)}x
                    </div>
                    <div className="text-[10px] text-theme-dim font-mono uppercase">
                      Baseline Ratio
                    </div>
                  </div>

                  {onExploreDate && (
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => onExploreDate(anomaly.timestamp)}
                    >
                      Jump to Timeline
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
