'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DatasetItem {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
}

interface DatasetMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergedSuccess?: (mergedDataset: any) => void;
}

export function DatasetMergeModal({
  isOpen,
  onClose,
  onMergedSuccess,
}: DatasetMergeModalProps) {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState('Unified Federated Archive');
  const [tagSources, setTagSources] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/v1/datasets')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.datasets || [];
        setDatasets(list);
        if (list.length >= 2) {
          setSelectedIds([list[0].id, list[1].id]);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      setErrorMsg('Please select at least 2 datasets to merge.');
      return;
    }

    setIsMerging(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/datasets/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mergedName.trim() || 'Unified Federated Archive',
          sourceDatasetIds: selectedIds,
          tagSources,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (onMergedSuccess) onMergedSuccess(data);
        onClose();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to merge datasets.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred during merge.');
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  const totalSelectedEvents = datasets
    .filter((d) => selectedIds.includes(d.id))
    .reduce((acc, d) => acc + (d.totalEvents || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-theme-text">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-xl bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-2xl flex flex-col gap-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-theme-raised flex items-center justify-center text-lg text-theme-accent border border-theme-border">
                🔀
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text">
                  Federated Multi-Stream Merge
                </h3>
                <p className="text-[10px] text-theme-dim">
                  Interleave 2+ archives into a single chronological timeline
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-theme-dim hover:text-theme-text hover:bg-theme-raised cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Merge Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-theme-dim">
              Destination Merged Archive Name
            </label>
            <input
              type="text"
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-raised border border-theme-border text-xs text-theme-text outline-none focus:border-theme-accent transition-colors"
              placeholder="e.g. Multi-App Case Audit 2026"
            />
          </div>

          {/* Dataset Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-theme-dim">
              <span>Select Streams to Interleave</span>
              <span className="text-theme-accent">{selectedIds.length} Selected ({totalSelectedEvents.toLocaleString()} Events)</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {datasets.map((d) => {
                const isSelected = selectedIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleSelect(d.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-theme-raised border-theme-accent/70 shadow-sm'
                        : 'bg-theme-base/60 border-theme-border hover:bg-theme-raised'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                      <span className="font-bold text-theme-text">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-theme-dim">
                      <span className="px-1.5 py-0.5 rounded bg-theme-base uppercase">{d.sourceType}</span>
                      <span>{(d.totalEvents || 0).toLocaleString()} msgs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-theme-raised border border-theme-border text-xs">
            <div>
              <span className="font-bold text-theme-text block">Tag Source Channel Names</span>
              <span className="text-[10px] text-theme-dim">Append `[WhatsApp]` or `[Telegram]` to participant tags</span>
            </div>
            <input
              type="checkbox"
              checked={tagSources}
              onChange={(e) => setTagSources(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-theme-border">
            <button
              onClick={onClose}
              disabled={isMerging}
              className="px-4 py-2 rounded-xl text-theme-dim hover:text-theme-text text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={isMerging || selectedIds.length < 2}
              className="px-5 py-2.5 rounded-xl bg-theme-accent text-black font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-lg"
            >
              {isMerging ? 'Interleaving Streams...' : `Merge ${selectedIds.length} Datasets`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
