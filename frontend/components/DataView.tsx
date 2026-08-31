import React, { useState, useRef } from 'react';
import {
  UploadIcon,
  DatabaseIcon,
  FileTextIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  TerminalIcon,
} from './Icons';
import { IngestionJobState } from './ProcessingModal';
import { PdfExportModal } from './PdfExportModal';
import { BatesStampingModal } from './BatesStampingModal';
import { UniversalDocumentStudio } from './UniversalDocumentStudio';
import { Button } from './ui/Button';

interface DatasetItem {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

interface DataViewProps {
  datasets: DatasetItem[];
  onDatasetDeleted: (id: string) => void;
  onExploreDataset: (id: string) => void;
  onStartIngestionJob: (job: IngestionJobState) => void;
}

export function DataView({
  datasets,
  onDatasetDeleted,
  onExploreDataset,
  onStartIngestionJob,
}: DataViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localPathInput, setLocalPathInput] = useState('');
  const [exportingDataset, setExportingDataset] = useState<DatasetItem | null>(null);
  const [isBatesOpen, setIsBatesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/ingest/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      // Trigger background job monitoring modal
      onStartIngestionJob({
        jobId: data.jobId,
        datasetId: data.datasetId,
        filename: data.filename || file.name,
        fileSize: data.fileSize || file.size,
        status: data.status || 'QUEUED',
        step: 'spooling',
        progress: 0,
        processedRows: 0,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload and start ingestion job.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPathInput.trim()) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/v1/ingest/submit-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: localPathInput.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit local file.');
      }

      const data = await response.json();
      setLocalPathInput('');

      onStartIngestionJob({
        jobId: data.jobId,
        datasetId: data.datasetId,
        filename: data.filename,
        fileSize: data.fileSize,
        status: data.status || 'QUEUED',
        step: 'spooling',
        progress: 0,
        processedRows: 0,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to ingest local file path.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/datasets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onDatasetDeleted(id);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Multi-Format Streaming Ingestion Zone */}
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface font-mono shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UploadIcon className="w-4 h-4 text-theme-accent" />
            <h2 className="text-xs font-semibold tracking-wider text-theme-text uppercase">
              STREAMING INGESTION ENGINE (ZERO BUFFERING)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">WhatsApp</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">Telegram</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">Discord</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">iMessage</span>
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">Signal</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">Slack</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">CSV / XLSX</span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">.ZIP Archives</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center space-y-4 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(0,240,255,0.2)]'
              : 'border-white/[0.15] hover:border-cyan-500/50 bg-black/30 hover:bg-black/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
            accept=".txt,.csv,.tsv,.json,.jsonl,.ndjson,.xlsx,.xls,.log,.zip,.signal,.imessage,.html,.htm,.mbox,.eml,.docx"
          />

          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 text-xl shadow-lg">
            {isUploading ? (
              <RefreshCwIcon className="w-6 h-6 animate-spin" />
            ) : (
              <UploadIcon className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-black text-neutral-100 uppercase tracking-wide">
              {isUploading ? 'Spooling Stream to Disk...' : isDragging ? 'Drop File to Ingest' : 'Drag & Drop Communication Archive or Click to Browse'}
            </p>
            <p className="text-xs text-neutral-400">
              Auto-detects Telegram JSON/HTML, Apple iMessage SQLite, Signal, WhatsApp, Slack, MBOX, and .ZIP bundles
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-neutral-300">
              🔒 100% Local-First Sandbox (Zero Cloud Uploads)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-cyan-300">
              🚀 Streaming SQLite Pipeline (&gt;25k msgs/sec)
            </span>
          </div>
        </div>

        {/* Local File Path Submission (Desktop-first) */}
        <form onSubmit={handleLocalSubmit} className="mt-4 pt-4 border-t border-theme-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 text-theme-dim text-xs shrink-0">
            <TerminalIcon className="w-4 h-4 text-theme-muted" />
            <span>LOCAL PATH:</span>
          </div>
          <input
            type="text"
            placeholder="C:\path\to\stream_export.txt or /var/log/data.csv"
            value={localPathInput}
            onChange={(e) => setLocalPathInput(e.target.value)}
            className="flex-1 bg-theme-base border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text placeholder:text-theme-dim focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent font-mono"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            isLoading={isUploading}
            disabled={!localPathInput.trim()}
          >
            Import Path
          </Button>
        </form>
      </section>

      {/* 2. Universal Document & PDF Studio */}
      <UniversalDocumentStudio
        onOpenBatesModal={() => setIsBatesOpen(true)}
        onOpenPdfExport={() => setExportingDataset(datasets[0] || null)}
      />

      {/* 3. Registered Datasets Table */}
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface font-mono shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-theme-accent" />
            <h2 className="text-xs font-semibold tracking-wider text-theme-text uppercase">
              LOCAL DATASET REPOSITORY ({datasets.length})
            </h2>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-xs text-theme-dim">
            No datasets currently registered. Drop a file above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-theme-border text-theme-muted text-[11px]">
                  <th className="py-3 px-4">DATASET</th>
                  <th className="py-3 px-4">SOURCE TYPE</th>
                  <th className="py-3 px-4">EVENT COUNT</th>
                  <th className="py-3 px-4">DATE SPAN</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-theme-raised transition-colors">
                    <td className="py-3.5 px-4 font-medium text-theme-text flex items-center gap-2">
                      <FileTextIcon className="w-4 h-4 text-theme-dim" />
                      <span>{ds.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-muted uppercase text-[11px]">
                      {ds.sourceType}
                    </td>
                    <td className="py-3.5 px-4 text-theme-accent font-semibold">
                      {ds.totalEvents.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-theme-muted text-[11px]">
                      {ds.startDate && ds.endDate
                        ? `${new Date(ds.startDate).toLocaleDateString()} - ${new Date(
                            ds.endDate,
                          ).toLocaleDateString()}`
                        : 'Recorded'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setExportingDataset(ds)}
                          title="Export Visual PDF Archive"
                        >
                          📄 PDF
                        </Button>
                        <a
                          href={`/api/v1/datasets/${ds.id}/export/csv`}
                          download
                          className="inline-flex items-center justify-center font-semibold font-mono text-[10px] sm:text-[11px] px-2 py-1 rounded-md gap-1 bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text transition-all"
                          title="Export Raw CSV"
                        >
                          📊 CSV
                        </a>
                        <a
                          href={`/api/v1/datasets/${ds.id}/export/json`}
                          download
                          className="inline-flex items-center justify-center font-semibold font-mono text-[10px] sm:text-[11px] px-2 py-1 rounded-md gap-1 bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text transition-all"
                          title="Export Structured JSON"
                        >
                          📦 JSON
                        </a>
                        <Button
                          variant="accent-outline"
                          size="xs"
                          onClick={() => onExploreDataset(ds.id)}
                        >
                          Explore
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => handleDelete(ds.id, ds.name)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Full Chat PDF Export Modal */}
      {exportingDataset && (
        <PdfExportModal
          isOpen={Boolean(exportingDataset)}
          onClose={() => setExportingDataset(null)}
          datasetId={exportingDataset.id}
          datasetName={exportingDataset.name}
          totalEvents={exportingDataset.totalEvents}
        />
      )}

      {/* Courtroom Bates Stamping & PII Redaction Studio Modal */}
      {isBatesOpen && (
        <BatesStampingModal
          isOpen={isBatesOpen}
          onClose={() => setIsBatesOpen(false)}
          datasetId={datasets[0]?.id || 'ds_mobile_demo_001'}
          datasetName={datasets[0]?.name || 'Forensic Case Alpha'}
        />
      )}
    </div>
  );
}
