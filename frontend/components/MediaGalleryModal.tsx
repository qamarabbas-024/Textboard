'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'contact' | 'media';
  filename?: string;
  timestamp: string;
  actor: string | null;
  content: string;
}

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
}

export function MediaGalleryModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: MediaGalleryModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'image' | 'audio' | 'video' | 'document' | 'sticker'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Fetch media events from backend search API
  useEffect(() => {
    if (!isOpen || !datasetId) return;

    setIsLoading(true);
    fetch(`/api/v1/search/${datasetId}?q=has:media&take=500`)
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => {
        const events = data.results || [];
        const parsed: MediaItem[] = events.map((evt: any) => {
          const content = evt.content || '';
          let type: MediaItem['type'] = 'media';
          let filename: string | undefined;

          if (/\.(jpg|jpeg|png|heic|webp)/i.test(content) || /IMG-|photo|<image/i.test(content)) {
            type = 'image';
            filename = content.match(/([^\s/\\:]+\.(jpg|jpeg|png|heic|webp))/i)?.[1];
          } else if (/\.(mp4|mov|3gp|mkv)/i.test(content) || /VID-|video/i.test(content)) {
            type = 'video';
            filename = content.match(/([^\s/\\:]+\.(mp4|mov|3gp|mkv))/i)?.[1];
          } else if (/\.(opus|mp3|m4a|ogg|wav)/i.test(content) || /AUD-|PTT-|audio/i.test(content)) {
            type = 'audio';
            filename = content.match(/([^\s/\\:]+\.(opus|mp3|m4a|ogg|wav))/i)?.[1];
          } else if (/\.(pdf|docx?|xlsx?|pptx?|zip|tar)/i.test(content) || /DOC-|document/i.test(content)) {
            type = 'document';
            filename = content.match(/([^\s/\\:]+\.(pdf|docx?|xlsx?|pptx?|zip|tar))/i)?.[1];
          } else if (/STK-|sticker/i.test(content)) {
            type = 'sticker';
            filename = content.match(/([^\s/\\:]+\.webp)/i)?.[1];
          }

          return {
            id: evt.id,
            type,
            filename: filename || 'Attachment',
            timestamp: evt.timestamp,
            actor: evt.actor,
            content: evt.content,
          };
        });

        setItems(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load media attachments:', err);
        setIsLoading(false);
      });
  }, [isOpen, datasetId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter !== 'ALL' && item.type !== selectedFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          item.filename?.toLowerCase().includes(q) ||
          item.actor?.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedFilter, searchFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl h-[85vh] rounded-2xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl overflow-hidden backdrop-blur-2xl font-mono text-slate-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold">
                📎
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">Media & Attachment Gallery</h2>
                <p className="text-[11px] text-slate-400">
                  {datasetName} • {items.length} detected attachments
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'image', 'audio', 'video', 'document', 'sticker'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    selectedFilter === filter
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by filename or sender..."
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 w-64"
            />
          </div>

          {/* Gallery Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Scanning stream attachment metadata...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500">
                <span className="text-3xl mb-2">📭</span>
                <span>No media attachments found matching your filters.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const dateStr = new Date(item.timestamp).toLocaleDateString();
                  const icons: Record<string, string> = {
                    image: '📷',
                    video: '🎥',
                    audio: '🎙️',
                    document: '📄',
                    sticker: '🎨',
                    contact: '👤',
                    media: '📎',
                  };

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/60 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{icons[item.type] || '📎'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                          {item.type}
                        </span>
                      </div>

                      <div className="min-w-0 mb-2">
                        <div className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors" title={item.filename}>
                          {item.filename}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.actor || 'Unknown'}
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/40">
                        <span>{dateStr}</span>
                        <span className="text-cyan-400 group-hover:underline">Inspect →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-slate-800/60 bg-slate-900/40 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Showing {filteredItems.length} of {items.length} attachments</span>
            <span className="text-cyan-400 font-bold">100% Local-First Forensic Inspection</span>
          </div>
        </motion.div>

        {/* Item Detail Inspector Sub-Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
            <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 font-mono text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-cyan-300">Attachment Metadata Descriptor</h3>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">FILENAME</span>
                  <span className="text-white font-bold">{previewItem.filename}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                  <span className="text-cyan-400 uppercase font-bold">{previewItem.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SENDER</span>
                  <span className="text-slate-200">{previewItem.actor || 'System'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                  <span className="text-slate-200">{new Date(previewItem.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RAW CONTENT</span>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 break-words mt-1">
                    {previewItem.content}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
