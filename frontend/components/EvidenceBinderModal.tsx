'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StarredEvidenceItem {
  id: string;
  datasetId: string;
  actor: string;
  timestamp: string;
  content: string;
  tags: string[];
}

interface EvidenceBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
}

export function EvidenceBinderModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: EvidenceBinderModalProps) {
  const [items, setItems] = useState<StarredEvidenceItem[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(`textboard_evidence_${datasetId}`);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        // Sample baseline evidence bookmark
        setItems([
          {
            id: 'ev_1',
            datasetId,
            actor: 'Lead Participant',
            timestamp: new Date().toISOString(),
            content: 'Please find the attached quarterly audit figures and confirmation for the transfer.',
            tags: ['#financial', '#critical'],
          },
        ]);
      }
    } catch {}
  }, [isOpen, datasetId]);

  const saveItems = (updated: StarredEvidenceItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(`textboard_evidence_${datasetId}`, JSON.stringify(updated));
    } catch {}
  };

  const removeEvidence = (id: string) => {
    saveItems(items.filter((item) => item.id !== id));
  };

  const addTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    const formattedTag = tag.startsWith('#') ? tag.trim() : `#${tag.trim()}`;
    const updated = items.map((item) => {
      if (item.id === id && !item.tags.includes(formattedTag)) {
        return { ...item, tags: [...item.tags, formattedTag] };
      }
      return item;
    });
    saveItems(updated);
    setNewTagInput('');
  };

  const exportBinderMarkdown = () => {
    const lines = [
      `# 🗂️ Forensic Evidence Binder — ${datasetName}`,
      `Generated: ${new Date().toISOString()}`,
      `Total Bookmarks: ${items.length}`,
      '',
      '---',
      '',
    ];

    for (const item of items) {
      lines.push(`### [${new Date(item.timestamp).toLocaleString()}] ${item.actor}`);
      lines.push(`Tags: ${item.tags.join(' ')}`);
      lines.push(`> "${item.content}"`);
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName}_Evidence_Binder.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags)));
  const filteredItems = selectedTagFilter === 'ALL'
    ? items
    : items.filter((i) => i.tags.includes(selectedTagFilter));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-theme-text">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-theme-raised flex items-center justify-center text-lg text-theme-accent border border-theme-border">
                📌
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text">
                  Forensic Evidence Case Binder
                </h3>
                <p className="text-[10px] text-theme-dim">
                  {datasetName} • {items.length} Starred Transmissions
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

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <button
              onClick={() => setSelectedTagFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                selectedTagFilter === 'ALL'
                  ? 'bg-theme-accent text-black'
                  : 'bg-theme-raised text-theme-dim hover:text-theme-text'
              }`}
            >
              ALL ({items.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(tag)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedTagFilter === tag
                    ? 'bg-theme-accent text-black'
                    : 'bg-theme-raised text-theme-dim hover:text-theme-text'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Bookmarks List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-theme-dim">
                No evidence items bookmarked for this tag filter.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-theme-raised border border-theme-border space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400">{item.actor}</span>
                      <span className="text-[10px] text-theme-dim">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => removeEvidence(item.id)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <p className="text-theme-text italic bg-theme-base/60 p-2.5 rounded-xl border border-theme-border/60">
                    &ldquo;{item.content}&rdquo;
                  </p>

                  {/* Tags */}
                  <div className="flex items-center flex-wrap gap-1.5 pt-1">
                    {item.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-theme-base border border-theme-border text-[10px] text-theme-accent"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-theme-border">
            <span className="text-[10px] text-theme-dim">
              Evidence items stored locally in browser state
            </span>
            <button
              onClick={exportBinderMarkdown}
              className="px-4 py-2 rounded-xl bg-theme-accent text-black font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
            >
              Export Case Binder (.MD)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
