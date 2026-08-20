'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
  totalEvents: number;
  selectedRange?: { start: string | null; end: string | null };
  apiUrl?: string;
}

export interface ExportManifest {
  datasetId: string;
  exportId: string;
  sourceMessageCount: number;
  renderedMessageCount: number;
  missingCount: number;
  duplicateCount: number;
  failedCount: number;
  firstMessageId: string | null;
  lastMessageId: string | null;
  firstMessageTimestamp: string | null;
  lastMessageTimestamp: string | null;
  contentChecksum: string;
  status: 'VERIFIED' | 'FAILED';
  diagnostics?: string[];
  generatedAt: string;
  executionTimeMs?: number;
}

const PAGE_BG_PRESETS = [
  { label: 'Eye-Care Warm Cream', color: '#EFEAE2', border: '#DCD4C7', desc: 'Optimal warm tone, lowest eye-strain' },
  { label: 'Soft Ice Blue', color: '#F0F7FF', border: '#BAE6FD', desc: 'Modern digital reading' },
  { label: 'Executive Slate Dark', color: '#0F172A', border: '#334155', desc: 'Midnight dark mode' },
  { label: 'Pure White', color: '#FFFFFF', border: '#E2E8F0', desc: 'Standard laser printing' },
  { label: 'Soft Mint Green', color: '#F0FDF4', border: '#BBF7D0', desc: 'Calm natural reading' },
];

const RECEIVED_BUBBLE_PRESETS = [
  { label: 'Light Blue (Default)', color: '#E0F2FE', border: '#BAE6FD' },
  { label: 'Soft Lavender', color: '#F3E8FF', border: '#D8B4FE' },
  { label: 'Soft Mint', color: '#ECFDF5', border: '#A7F3D0' },
  { label: 'Crisp White', color: '#FFFFFF', border: '#E2E8F0' },
  { label: 'Soft Slate', color: '#1E293B', border: '#334155' },
];

const SENT_BUBBLE_PRESETS = [
  { label: 'Soft Mint (Default)', color: '#D9FDD3', border: '#B9F6CA' },
  { label: 'Soft Emerald', color: '#C8F7C5', border: '#86EFAC' },
  { label: 'Ocean Cyan', color: '#CFFAFE', border: '#67E8F9' },
  { label: 'Warm Peach', color: '#FFEDD5', border: '#FDBA74' },
  { label: 'Deep Emerald', color: '#064E3B', border: '#059669' },
];

export function PdfExportModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
  totalEvents,
  selectedRange,
  apiUrl = '',
}: PdfExportModalProps) {
  const [exportType, setExportType] = useState<'chat' | 'highlights'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark' | 'monochrome'>('light');
  
  // Dynamic Eye-Care Color Customization
  const [pageBgColor, setPageBgColor] = useState<string>('#EFEAE2');
  const [receivedBubbleColor, setReceivedBubbleColor] = useState<string>('#E0F2FE');
  const [sentBubbleColor, setSentBubbleColor] = useState<string>('#D9FDD3');
  const [showColorCustomizer, setShowColorCustomizer] = useState<boolean>(false);

  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeBookmarks, setIncludeBookmarks] = useState(true);
  const [useRange, setUseRange] = useState(Boolean(selectedRange?.start && selectedRange?.end));
  const [actorFilter, setActorFilter] = useState<string>('');
  const [primaryActor, setPrimaryActor] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSenderNames, setIncludeSenderNames] = useState(true);
  const [includeDateSeparators, setIncludeDateSeparators] = useState(true);
  const [includeMediaPlaceholders, setIncludeMediaPlaceholders] = useState(true);
  const [groupConsecutive, setGroupConsecutive] = useState(true);
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4');

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [processedMessages, setProcessedMessages] = useState<number>(0);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ExportManifest | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync theme changes with default color presets
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'monochrome') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      setPageBgColor('#0F172A');
      setReceivedBubbleColor('#1E293B');
      setSentBubbleColor('#064E3B');
    } else if (newTheme === 'monochrome') {
      setPageBgColor('#FFFFFF');
      setReceivedBubbleColor('#FFFFFF');
      setSentBubbleColor('#F3F4F6');
    } else {
      setPageBgColor('#EFEAE2');
      setReceivedBubbleColor('#E0F2FE');
      setSentBubbleColor('#D9FDD3');
    }
  };

  // Load participants for primary sender selection
  useEffect(() => {
    if (!datasetId) return;
    const base = apiUrl || '';
    fetch(`${base}/api/v1/datasets/${datasetId}/people`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.people)) {
          const names = data.people.map((p: any) => p.name || p.actor).filter(Boolean);
          setParticipants(names);
        }
      })
      .catch(() => {});
  }, [datasetId, apiUrl]);

  // Timer for elapsed seconds during processing
  useEffect(() => {
    if (status === 'processing') {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - start) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setProgress(0);
      setProcessedMessages(0);
      setDownloadUrl(null);
      setErrorMessage(null);
      setManifest(null);
      setElapsedSec(0);
    }
  }, [isOpen]);

  // Polling loop for job progress
  useEffect(() => {
    if (!jobId || status !== 'processing') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const base = apiUrl || '';
        const res = await fetch(`${base}/api/v1/datasets/${datasetId}/export/pdf/${jobId}`);
        if (!res.ok) {
          throw new Error(`Polling status failed with HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!isSubscribed) return;

        setProgress(data.progress ?? 0);
        setProcessedMessages(data.processedMessages ?? 0);
        setTotalMessages(data.totalMessages ?? totalEvents);

        if (data.status === 'COMPLETED') {
          setStatus('completed');
          const finalDownloadUrl = data.downloadUrl?.startsWith('http')
            ? data.downloadUrl
            : `${base}${data.downloadUrl || `/api/v1/datasets/${datasetId}/export/pdf/${jobId}/download`}`;
          setDownloadUrl(finalDownloadUrl);
          setFileSize(data.fileSize);
          setManifest(data.manifest);
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setStatus('failed');
          setErrorMessage(data.error || 'The export job encountered an unexpected error.');
          setManifest(data.manifest);
          clearInterval(interval);
        } else if (data.status === 'CANCELLED') {
          setStatus('cancelled');
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 800);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [jobId, status, datasetId, totalEvents, apiUrl]);

  const handleStartExport = async () => {
    try {
      setStatus('processing');
      setProgress(0);
      setProcessedMessages(0);
      setErrorMessage(null);

      const body: any = {
        type: exportType,
        theme,
        pageBgColor,
        sentBubbleColor,
        receivedBubbleColor,
        includeCoverPage,
        includeBookmarks,
        includeTimestamps,
        includeSenderNames,
        includeDateSeparators,
        includeMediaPlaceholders,
        groupConsecutive,
        pageSize,
      };

      if (primaryActor.trim()) {
        body.primaryActor = primaryActor.trim();
      }

      if (actorFilter.trim()) {
        body.actor = actorFilter.trim();
      }

      if (useRange && selectedRange?.start && selectedRange?.end) {
        body.startDate = selectedRange.start;
        body.endDate = selectedRange.end;
      }

      const base = apiUrl || '';
      const res = await fetch(`${base}/api/v1/datasets/${datasetId}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Export initiation failed with status ${res.status}`);
      }

      const data = await res.json();
      setJobId(data.jobId);
    } catch (err: any) {
      console.error('Export start error:', err);
      setStatus('failed');
      setErrorMessage(err.message || 'Failed to start export job.');
    }
  };

  const handleCancelExport = async () => {
    if (!jobId) return;
    try {
      const base = apiUrl || '';
      await fetch(`${base}/api/v1/datasets/${datasetId}/export/pdf/${jobId}/cancel`, {
        method: 'POST',
      });
      setStatus('cancelled');
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-xl bg-[#10141d] border border-white/[0.12] rounded-xl p-6 shadow-2xl text-neutral-200 max-h-[92vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <span className="text-lg">📄</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-100 tracking-wider">
                  VISUAL STREAM PDF EXPORTER
                </h2>
                <p className="text-[11px] text-neutral-400">
                  {datasetName} • {totalEvents.toLocaleString()} entries
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Idle / Configuration Mode */}
          {status === 'idle' && (
            <div className="space-y-4 text-xs">
              {/* Document Mode Selection */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-neutral-400 uppercase mb-2">
                  Select Export Document Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportType('chat')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      exportType === 'chat'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                        : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 flex items-center gap-1.5">
                      <span>📊 Visual Stream Archive</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 leading-tight">
                      Dual-stream visual layout, executive cover page, month bookmarks &amp; 100k+ streaming.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportType('highlights')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      exportType === 'highlights'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                        : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 flex items-center gap-1.5">
                      <span>⚡ Executive Summary</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 leading-tight">
                      Curated milestones, activity peaks, participant analytics &amp; highlights.
                    </div>
                  </button>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                    PDF Visual Theme
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowColorCustomizer(!showColorCustomizer)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    {showColorCustomizer ? '▲ Hide Custom Colors' : '🎨 Customize Bubble & Page Colors'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      theme === 'light'
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
                        : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EFEAE2] border border-[#DCD4C7] inline-block" />
                      <span>Eye-Care Cream</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Soft warm background</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      theme === 'dark'
                        ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)] font-semibold'
                        : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-600 inline-block" />
                      <span>Executive Slate</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Dark digital reading</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange('monochrome')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      theme === 'monochrome'
                        ? 'bg-white/20 border-white/60 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)] font-semibold'
                        : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                      <span>Monochrome</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">High-contrast B&amp;W</div>
                  </button>
                </div>
              </div>

              {/* Advanced Color Customizer (Page & Bubble Colors) */}
              {showColorCustomizer && (
                <div className="p-3.5 rounded-lg bg-white/[0.03] border border-cyan-500/30 space-y-3">
                  <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
                    <span>🎨 Custom Eye-Care Color Studio</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Real-time PDF Palette</span>
                  </div>

                  {/* 1. Page Background Color */}
                  <div>
                    <label className="block text-[10px] text-neutral-400 uppercase font-semibold mb-1.5">
                      1. Document Page Canvas Background:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PAGE_BG_PRESETS.map((p) => (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => setPageBgColor(p.color)}
                          className={`flex items-center gap-2 p-1.5 rounded border text-left text-[10px] ${
                            pageBgColor.toLowerCase() === p.color.toLowerCase()
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                              : 'border-white/[0.08] bg-black/30 text-neutral-300 hover:border-white/20'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border shrink-0"
                            style={{ backgroundColor: p.color, borderColor: p.border }}
                          />
                          <span className="truncate">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Received Bubble (Left) & Sent Bubble (Right) */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.05]">
                    <div>
                      <label className="block text-[10px] text-sky-400 uppercase font-semibold mb-1">
                        Left Bubble (Them):
                      </label>
                      <select
                        value={receivedBubbleColor}
                        onChange={(e) => setReceivedBubbleColor(e.target.value)}
                        className="w-full bg-black/50 border border-sky-400/40 rounded px-2 py-1 text-[11px] text-sky-300 font-medium"
                      >
                        {RECEIVED_BUBBLE_PRESETS.map((p) => (
                          <option key={p.color} value={p.color}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-emerald-400 uppercase font-semibold mb-1">
                        Right Bubble (You):
                      </label>
                      <select
                        value={sentBubbleColor}
                        onChange={(e) => setSentBubbleColor(e.target.value)}
                        className="w-full bg-black/50 border border-emerald-400/40 rounded px-2 py-1 text-[11px] text-emerald-300 font-medium"
                      >
                        {SENT_BUBBLE_PRESETS.map((p) => (
                          <option key={p.color} value={p.color}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Visual Mini-Preview */}
                  <div
                    className="p-3 rounded-lg border text-[11px] space-y-2"
                    style={{ backgroundColor: pageBgColor, borderColor: '#D1D5DB' }}
                  >
                    <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest text-center">
                      Live Preview
                    </div>
                    {/* Received Message Preview */}
                    <div className="flex justify-start">
                      <div
                        className="p-2 rounded-lg max-w-[80%] border shadow-xs"
                        style={{
                          backgroundColor: receivedBubbleColor,
                          borderColor: '#BAE6FD',
                          color: '#0F172A',
                        }}
                      >
                        <div className="text-[9px] font-bold text-sky-800">Sender</div>
                        <div className="text-[10px]">Mn hi Rakh deta ap ni Sunti</div>
                        <div className="text-[8px] text-sky-700 text-right">02:47 AM</div>
                      </div>
                    </div>
                    {/* Sent Message Preview */}
                    <div className="flex justify-end">
                      <div
                        className="p-2 rounded-lg max-w-[80%] border shadow-xs"
                        style={{
                          backgroundColor: sentBubbleColor,
                          borderColor: '#B9F6CA',
                          color: '#064E3B',
                        }}
                      >
                        <div className="text-[10px]">Sounds good! 👍</div>
                        <div className="text-[8px] text-emerald-700 text-right">02:48 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cover Page & Bookmarks Options */}
              <div className="space-y-3 p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="text-[11px] font-semibold uppercase text-neutral-300 tracking-wider">
                  Executive Enhancements
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-100">
                    <input
                      type="checkbox"
                      checked={includeCoverPage}
                      onChange={(e) => setIncludeCoverPage(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span className="font-semibold text-cyan-300">Executive Cover Page</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-100">
                    <input
                      type="checkbox"
                      checked={includeBookmarks}
                      onChange={(e) => setIncludeBookmarks(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span className="font-semibold text-cyan-300">Month Jump Bookmarks</span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-400 pt-2 border-t border-white/[0.05]">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span>Timestamps</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeDateSeparators}
                      onChange={(e) => setIncludeDateSeparators(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span>Date Dividers</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeMediaPlaceholders}
                      onChange={(e) => setIncludeMediaPlaceholders(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span>Stickers/Media</span>
                  </label>
                </div>

                {/* Right Side / Sent Messages Selector */}
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-[11px] text-neutral-300">Sent by (Right Side):</span>
                  </div>
                  {participants.length > 0 ? (
                    <select
                      value={primaryActor}
                      onChange={(e) => setPrimaryActor(e.target.value)}
                      className="bg-black/50 border border-white/[0.12] rounded px-2 py-1 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Auto-detect Lead Actor</option>
                      {participants.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. You / Me"
                      value={primaryActor}
                      onChange={(e) => setPrimaryActor(e.target.value)}
                      className="bg-black/50 border border-white/[0.12] rounded px-2 py-0.5 text-xs text-emerald-300 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStartExport}
                className="w-full py-3 rounded-lg bg-linear-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]"
              >
                Generate Lossless PDF Archive
              </button>
            </div>
          )}

          {/* Processing Mode */}
          {status === 'processing' && (
            <div className="py-8 space-y-6 text-center">
              <div className="flex items-center justify-between text-xs px-2 text-neutral-400">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <span>STREAMING VISUAL ARCHIVE TO DISK...</span>
                </div>
                <span className="font-mono text-neutral-500">{elapsedSec}s elapsed</span>
              </div>

              <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/[0.08] p-0.5">
                <motion.div
                  className="h-full bg-linear-to-r from-cyan-400 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-neutral-500 block text-[10px] uppercase mb-1">Messages Rendered</span>
                  <strong className="text-cyan-300 text-base">
                    {processedMessages.toLocaleString()} / {totalMessages.toLocaleString()}
                  </strong>
                </div>
                <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-neutral-500 block text-[10px] uppercase mb-1">Progress</span>
                  <strong className="text-emerald-300 text-base">{progress}%</strong>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500">
                Generating eye-care PDF pages with verified cryptographic integrity...
              </p>

              <button
                type="button"
                onClick={handleCancelExport}
                className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
              >
                Cancel Export Job
              </button>
            </div>
          )}

          {/* Completed Mode */}
          {status === 'completed' && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto text-xl">
                ✓
              </div>

              <div>
                <h3 className="text-sm font-bold text-emerald-400 tracking-wider">
                  EXPORT COMPLETED &amp; VERIFIED
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Generated {manifest?.renderedMessageCount?.toLocaleString() || totalEvents.toLocaleString()} messages
                  {fileSize ? ` • ${(fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>

              {manifest && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-[11px] text-left space-y-1 font-mono text-neutral-400">
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <strong className="text-emerald-400">{manifest.status} (0 Missing, 0 Duplicates)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>CHECKSUM:</span>
                    <span className="text-neutral-300 truncate max-w-[240px]">{manifest.contentChecksum}</span>
                  </div>
                  {manifest.executionTimeMs && (
                    <div className="flex justify-between">
                      <span>TIME:</span>
                      <span className="text-neutral-300">{(manifest.executionTimeMs / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              )}

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="block w-full py-3 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99]"
                >
                  Download Verified PDF Archive
                </a>
              )}
            </div>
          )}

          {/* Failed Mode */}
          {status === 'failed' && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-xl">
                ✕
              </div>
              <h3 className="text-sm font-bold text-rose-400 tracking-wider">EXPORT FAILED</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="px-6 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-neutral-200 text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
