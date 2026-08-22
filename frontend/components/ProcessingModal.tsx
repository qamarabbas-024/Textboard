import React, { useEffect, useState } from 'react';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XIcon,
  TerminalIcon,
  ArrowRightIcon,
} from './Icons';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

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
    { key: 'normalizing', label: 'Entity Extraction' },
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
      <div className="w-full max-w-xl rounded-xl border border-theme-border bg-theme-surface p-6 shadow-2xl text-theme-text font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-active border border-theme-border-hi text-theme-accent">
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text text-sm tracking-wider uppercase">
                {isFinished ? 'INGESTION COMPLETE' : isFailed ? 'INGESTION FAILED' : 'STREAMING INGESTION'}
              </h3>
              <p className="text-xs text-theme-dim">
                JOB ID: <span className="text-theme-accent">{job.jobId.slice(0, 16)}...</span>
              </p>
            </div>
          </div>

          <IconButton
            variant="ghost"
            size="sm"
            label="Close modal"
            icon={<XIcon className="w-4 h-4" />}
            onClick={onClose}
          />
        </div>

        {/* Target File Info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-theme-base border border-theme-border text-xs mb-6">
          <div>
            <span className="text-theme-dim block">SOURCE FILE</span>
            <span className="text-theme-text font-medium truncate block">{job.filename || 'Direct Upload'}</span>
          </div>
          <div>
            <span className="text-theme-dim block">STATUS / ELAPSED</span>
            <span className="text-theme-accent font-medium">
              {job.status} ({job.executionTimeMs ? `${job.executionTimeMs}ms` : `${elapsedSeconds}s`})
            </span>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-muted font-medium">
              PROCESSED: <strong className="text-theme-text">{job.processedRows.toLocaleString()}</strong> RECORDS
            </span>
            <span className="font-bold text-theme-accent">{job.progress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-theme-base overflow-hidden p-0.5 border border-theme-border">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFinished
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-theme-accent shadow-theme-glow'
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
                className={`p-2 rounded-lg border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                    : isCurrent
                    ? 'bg-theme-active border-theme-border-hi text-theme-accent font-bold shadow-theme-glow'
                    : 'bg-theme-base border-theme-border text-theme-dim'
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
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs mb-6 flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <strong>Ingestion Failed:</strong> {job.errorMessage}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-theme-border pt-4">
          {isProcessing && onCancelJob && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onCancelJob(job.jobId)}
            >
              Cancel Import
            </Button>
          )}

          {isFinished && job.datasetId && onExploreDataset && (
            <Button
              variant="primary"
              size="md"
              className="ml-auto"
              onClick={() => onExploreDataset(job.datasetId!)}
              rightIcon={<ArrowRightIcon className="w-4 h-4" />}
            >
              Explore Dataset
            </Button>
          )}

          {!isProcessing && (!isFinished || !job.datasetId) && (
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
