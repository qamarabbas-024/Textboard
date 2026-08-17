'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  apiUrl: string;
  selectedRange?: { start: string | null; end: string | null };
}

export function PdfExportModal({
  isOpen,
  onClose,
  datasetId,
  apiUrl,
  selectedRange,
}: PdfExportModalProps) {
  const [exportType, setExportType] = useState<'chat' | 'highlights'>('chat');
  const [useRange, setUseRange] = useState(Boolean(selectedRange?.start && selectedRange?.end));
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll status when jobId is active
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/datasets/${datasetId}/export/pdf/${jobId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          if (data.status === 'completed') {
            setDownloadUrl(`${apiUrl}${data.downloadUrl}`);
          } else if (data.status === 'failed') {
            setErrorMessage(data.error || 'Export failed');
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [jobId, status, apiUrl, datasetId]);

  const handleStartExport = async () => {
    setStatus('processing');
    setJobId(null);
    setDownloadUrl(null);
    setErrorMessage(null);

    try {
      const body: any = {
        type: exportType,
      };

      if (useRange && selectedRange?.start && selectedRange?.end) {
        body.startDate = selectedRange.start;
        body.endDate = selectedRange.end;
      }

      const res = await fetch(`${apiUrl}/datasets/${datasetId}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Failed to start PDF export');
      }

      const data = await res.json();
      setJobId(data.jobId);
    } catch (e: any) {
      setStatus('failed');
      setErrorMessage(e.message || 'Export failed to start');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-theme-surface border border-theme-border rounded-theme p-6 shadow-2xl terminal-interactive"
        >
          <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-theme-accent">📄</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text">
                Export to PDF Document
              </h3>
            </div>
            <button onClick={onClose} className="text-theme-dim hover:text-theme-text text-sm">
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Export Mode */}
            <div>
              <label className="block text-theme-dim font-bold uppercase tracking-wider mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportType('chat')}
                  className={`p-3 rounded-theme border text-left transition-all ${
                    exportType === 'chat'
                      ? 'bg-theme-raised border-theme-border-hi text-theme-accent font-bold'
                      : 'bg-theme-base border-theme-border text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <div className="font-semibold text-xs mb-1">💬 Full Chat View</div>
                  <div className="text-[10px] text-theme-dim">
                    Chat bubbles, sender badges &amp; timestamps.
                  </div>
                </button>

                <button
                  onClick={() => setExportType('highlights')}
                  className={`p-3 rounded-theme border text-left transition-all ${
                    exportType === 'highlights'
                      ? 'bg-theme-raised border-theme-border-hi text-theme-accent font-bold'
                      : 'bg-theme-base border-theme-border text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <div className="font-semibold text-xs mb-1">🌟 Highlights Only</div>
                  <div className="text-[10px] text-theme-dim">
                    Milestones, overview, and key records.
                  </div>
                </button>
              </div>
            </div>

            {/* Date Range Option (if chat export) */}
            {exportType === 'chat' && selectedRange?.start && selectedRange?.end && (
              <div className="bg-theme-base border border-theme-border p-3 rounded-theme flex items-center justify-between">
                <div>
                  <div className="font-semibold text-theme-text">Apply Current Date Filter?</div>
                  <div className="text-[10px] text-theme-dim">
                    {new Date(selectedRange.start).toLocaleDateString()} &ndash;{' '}
                    {new Date(selectedRange.end).toLocaleDateString()}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useRange}
                  onChange={(e) => setUseRange(e.target.checked)}
                  className="accent-emerald-500 cursor-pointer h-4 w-4"
                />
              </div>
            )}

            {/* Action / Progress Status */}
            {status === 'processing' && (
              <div className="p-4 bg-theme-base border border-theme-border rounded-theme text-center">
                <div className="flex items-center justify-center gap-2 text-theme-accent mb-1 font-bold">
                  <span className="h-2 w-2 bg-theme-accent rounded-full animate-ping" />
                  <span>Generating PDF in background...</span>
                </div>
                <p className="text-[11px] text-theme-dim">
                  Formatting chat layout &amp; streaming pages...
                </p>
              </div>
            )}

            {status === 'completed' && downloadUrl && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-theme text-center"
              >
                <div className="font-bold text-xs mb-2">✅ PDF is ready to download!</div>
                <a
                  href={downloadUrl}
                  download
                  className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-theme shadow-md transition-colors"
                >
                  Download PDF File
                </a>
              </motion.div>
            )}

            {status === 'failed' && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-theme">
                {errorMessage || 'Generation failed'}
              </div>
            )}

            {status === 'idle' && (
              <button
                onClick={handleStartExport}
                className="w-full py-2.5 bg-theme-raised hover:bg-theme-active border border-theme-border-hi/60 text-theme-accent font-bold uppercase tracking-wider text-xs rounded-theme transition-all shadow-theme-glow"
              >
                Start Background Export
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
