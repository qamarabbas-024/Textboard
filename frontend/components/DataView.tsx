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
      <section className="p-6 rounded-xl border border-white/[0.08] bg-[#10141d]/80 font-mono">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UploadIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              STREAMING INGESTION ENGINE (ZERO BUFFERING)
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500">
            SUPPORTS: .TXT, .CSV, .JSON, .JSONL, .XLSX, .LOG
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
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
          className={`p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center space-y-3 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/[0.08] shadow-[0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-white/[0.12] hover:border-cyan-500/40 bg-white/[0.02]'
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
            accept=".txt,.csv,.tsv,.json,.jsonl,.ndjson,.xlsx,.xls,.log"
          />

          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            {isUploading ? (
              <RefreshCwIcon className="w-6 h-6 animate-spin" />
            ) : (
              <UploadIcon className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-200">
              {isUploading ? 'Spooling Stream to Disk...' : 'Drop communication stream or tabular dataset here'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports large 100,000+ entry datasets without memory limits
            </p>
          </div>
        </div>

        {/* Local File Path Submission (Desktop-first) */}
        <form onSubmit={handleLocalSubmit} className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
          <div className="flex items-center gap-2 text-neutral-500 text-xs shrink-0">
            <TerminalIcon className="w-4 h-4 text-neutral-400" />
            <span>LOCAL PATH:</span>
          </div>
          <input
            type="text"
            placeholder="C:\path\to\stream_export.txt or /var/log/data.csv"
            value={localPathInput}
            onChange={(e) => setLocalPathInput(e.target.value)}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={isUploading || !localPathInput.trim()}
            className="px-4 py-1.5 rounded-md bg-white/[0.08] hover:bg-cyan-500/20 hover:text-cyan-300 text-neutral-200 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Import Path
          </button>
        </form>
      </section>

      {/* 2. Registered Datasets Table */}
      <section className="p-6 rounded-xl border border-white/[0.08] bg-[#10141d]/80 font-mono">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              LOCAL DATASET REPOSITORY ({datasets.length})
            </h2>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No datasets currently registered. Drop a file above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-neutral-400 text-[11px]">
                  <th className="py-3 px-4">DATASET</th>
                  <th className="py-3 px-4">SOURCE TYPE</th>
                  <th className="py-3 px-4">EVENT COUNT</th>
                  <th className="py-3 px-4">DATE SPAN</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-neutral-100 flex items-center gap-2">
                      <FileTextIcon className="w-4 h-4 text-neutral-500" />
                      <span>{ds.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 uppercase text-[11px]">
                      {ds.sourceType}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 font-semibold">
                      {ds.totalEvents.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                      {ds.startDate && ds.endDate
                        ? `${new Date(ds.startDate).toLocaleDateString()} - ${new Date(
                            ds.endDate,
                          ).toLocaleDateString()}`
                        : 'Recorded'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setExportingDataset(ds)}
                        className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.15] transition-colors inline-flex items-center gap-1"
                        title="Export Visual PDF Archive"
                      >
                        <span>📄</span>
                        <span>Export PDF</span>
                      </button>
                      <button
                        onClick={() => onExploreDataset(ds.id)}
                        className="px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                      >
                        Explore
                      </button>
                      <button
                        onClick={() => handleDelete(ds.id, ds.name)}
                        className="px-2.5 py-1 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/20 transition-colors"
                      >
                        Delete
                      </button>
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
    </div>
  );
}
