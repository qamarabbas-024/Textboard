'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  UsersIcon,
  SparklesIcon,
  ActivityIcon,
  TerminalIcon,
} from './Icons';
import { Button } from './ui/Button';

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
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-active border border-theme-border-hi flex items-center justify-center text-theme-accent">
              <AlertCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">
                  FORENSIC PATTERN &amp; ANOMALY DETECTOR
                </h2>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  V2.1 ENGINE
                </span>
              </div>
              <p className="text-xs text-theme-dim mt-0.5">
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
          <div className="p-4 rounded-lg bg-theme-base border border-theme-border">
            <span className="text-[10px] text-theme-dim block uppercase font-semibold">Total Anomalies</span>
            <span className="text-2xl font-bold text-theme-text mt-1 block">
              {report?.totalAnomalies || 0}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-theme-base border border-rose-500/30">
            <span className="text-[10px] text-rose-400 block uppercase font-semibold">Critical Alerts</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">
              {report?.criticalCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-theme-base border border-amber-500/30">
            <span className="text-[10px] text-amber-400 block uppercase font-semibold">Warnings</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {report?.warningCount || 0}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-theme-base border border-theme-border">
            <span className="text-[10px] text-theme-accent block uppercase font-semibold">Noteworthy Events</span>
            <span className="text-2xl font-bold text-theme-accent mt-1 block">
              {report?.noteCount || 0}
            </span>
          </div>
        </div>
      </section>

      {/* Filter Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-surface p-3 rounded-xl border border-theme-border text-xs">
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
                className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? sev === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : sev === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-theme-active text-theme-accent border border-theme-border-hi'
                    : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
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
          <div className="p-12 rounded-xl border border-theme-border bg-theme-surface/50 text-center text-xs text-theme-dim">
            {isLoading ? 'Scanning communication stream for forensic patterns...' : 'No forensic anomalies detected matching the active filters.'}
          </div>
        ) : (
          filtered.map((anomaly) => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isWarning = anomaly.severity === 'WARNING';

            const badgeColor = isCritical
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : isWarning
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-theme-active text-theme-accent border-theme-border-hi';

            return (
              <div
                key={anomaly.id}
                className="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${badgeColor}`}>
                      {anomaly.severity} • {anomaly.type.replace(/_/g, ' ')}
                    </span>
                    {anomaly.actor && (
                      <span className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-theme-muted text-[11px]">
                        Actor: <strong className="text-theme-text">{anomaly.actor}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-theme-dim">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{new Date(anomaly.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-theme-text text-sm mb-1">{anomaly.title}</h3>
                  <p className="text-xs text-theme-muted font-sans leading-relaxed">{anomaly.description}</p>
                </div>

                {/* Metric Ratio Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-theme-base border border-theme-border text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-theme-dim">Measured: <strong className="text-theme-text font-mono">{anomaly.metrics.value} {anomaly.metrics.unit}</strong></span>
                    <span className="text-theme-dim">Baseline: <strong className="text-theme-muted font-mono">{anomaly.metrics.baseline}</strong></span>
                    <span className="px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-accent font-bold text-[11px]">
                      {anomaly.metrics.ratio}x Baseline
                    </span>
                  </div>

                  {onExploreDate && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onExploreDate(anomaly.timestamp)}
                    >
                      Jump to Timeline →
                    </Button>
                  )}
                </div>

                {/* Sample Snippet Preview */}
                {anomaly.sampleSnippet && (
                  <div className="p-2.5 rounded-lg bg-theme-base/60 border border-theme-border text-[11px] text-theme-dim flex items-center gap-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-theme-muted shrink-0" />
                    <span className="italic truncate">&quot;{anomaly.sampleSnippet}&quot;</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
