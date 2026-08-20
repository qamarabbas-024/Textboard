import React, { useEffect, useState } from 'react';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XIcon,
  TerminalIcon,
  ArrowRightIcon,
} from './Icons';

export interface IngestionJobState {
  jobId: string;
  datasetId?: string;
  datasetName?: string;
  filename?: string;
  fileSize?: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  step?: string;
  progress: number;
  processedRows: number;
  failedRows?: number;
  totalRows?: number;
  errorMessage?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  executionTimeMs?: number;
}

interface ProcessingModalProps {
  job: IngestionJobState | null;
  isOpen: boolean;
  onClose: () => void;
  onExploreDataset?: (datasetId: string) => void;
  onCancelJob?: (jobId: string) => void;
}

export function ProcessingModal({
  job,
  isOpen,
  onClose,
  onExploreDataset,
  onCancelJob,
}: ProcessingModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [job]);

  if (!isOpen || !job) return null;

  const isFinished = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';
  const isCancelled = job.status === 'CANCELLED';
  const isProcessing = job.status === 'PROCESSING' || job.status === 'QUEUED';

  const steps = [
    { key: 'spooling', label: 'Spooling Stream' },
    { key: 'parsing', label: 'Streaming Parser' },
    { key: 'normalizing', label: 'Entity & Metric Extraction' },
    { key: 'completed', label: 'Indexed & Ready' },
  ];

  const getCurrentStepIndex = () => {
    if (isFinished) return 3;
    if (job.step === 'spooling') return 0;
    if (job.step === 'parsing') return 1;
    if (job.step === 'normalizing' || job.step === 'indexing') return 2;
    return 1;
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl rounded-xl border border-white/[0.12] bg-[#0e1118] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-neutral-200 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm tracking-wider uppercase">
                {isFinished ? 'INGESTION COMPLETE' : isFailed ? 'INGESTION FAILED' : 'STREAMING INGESTION'}
              </h3>
              <p className="text-xs text-neutral-400">
                JOB ID: <span className="text-cyan-400">{job.jobId.slice(0, 16)}...</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Target File Info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs mb-6">
          <div>
            <span className="text-neutral-500 block">SOURCE FILE</span>
            <span className="text-neutral-200 font-medium truncate block">{job.filename || 'Direct Upload'}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">STATUS / ELAPSED</span>
            <span className="text-cyan-300 font-medium">
              {job.status} ({job.executionTimeMs ? `${job.executionTimeMs}ms` : `${elapsedSeconds}s`})
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">
              PROCESSED: <strong className="text-neutral-100">{job.processedRows.toLocaleString()}</strong> RECORDS
            </span>
            <span className="font-bold text-cyan-400">{job.progress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFinished
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
              }`}
              style={{ width: `${Math.max(4, job.progress)}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-[11px]">
          {steps.map((step, idx) => {
            const isCompleted = isFinished || idx < currentStepIdx;
            const isCurrent = !isFinished && idx === currentStepIdx;
            return (
              <div
                key={step.key}
                className={`p-2 rounded border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                    : isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                    : 'bg-white/[0.02] border-white/[0.05] text-neutral-600'
                }`}
              >
                <div className="font-semibold mb-0.5">0{idx + 1}</div>
                <div className="truncate">{step.label}</div>
              </div>
            );
          })}
        </div>

        {/* Error Details if Failed */}
        {isFailed && job.errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs mb-6 flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <strong>Ingestion Failed:</strong> {job.errorMessage}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
          {isProcessing && onCancelJob && (
            <button
              onClick={() => onCancelJob(job.jobId)}
              className="px-3.5 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs transition-colors"
            >
              Cancel Import
            </button>
          )}

          {isFinished && job.datasetId && onExploreDataset && (
            <button
              onClick={() => onExploreDataset(job.datasetId!)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              <span>Explore Dataset</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}

          {!isProcessing && (!isFinished || !job.datasetId) && (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-1.5 rounded bg-white/[0.08] hover:bg-white/[0.12] text-neutral-200 text-xs transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
