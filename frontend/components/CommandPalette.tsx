'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavTab } from './WorkstationNav';
import { AppTheme, THEMES } from './ThemeSwitcher';

export interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'DATASETS' | 'EXPORTS' | 'THEMES' | 'ACTIONS';
  title: string;
  subtitle?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  datasets: Array<{ id: string; name: string; totalEvents: number }>;
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onTriggerExport: () => void;
  onOpenPinLock?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenAssistant?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onTriggerExport,
  onOpenPinLock,
  onOpenMediaGallery,
  onOpenAssistant,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const applyTheme = (theme: AppTheme) => {
    localStorage.setItem('textboard_app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  // Build items catalog
  const items: CommandItem[] = [
    // 1. Navigation
    {
      id: 'nav_home',
      category: 'NAVIGATION',
      title: 'Workstation Overview',
      subtitle: 'Executive summaries, metrics, and recent telemetry',
      icon: '⚡',
      shortcut: '1',
      action: () => onSelectTab('HOME'),
    },
    {
      id: 'nav_explore',
      category: 'NAVIGATION',
      title: 'Explore Timeline & Scrubber',
      subtitle: 'Chronological message scrubber & entity matrix',
      icon: '🧭',
      shortcut: '2',
      action: () => onSelectTab('EXPLORE'),
    },
    {
      id: 'nav_data',
      category: 'NAVIGATION',
      title: 'Data Stream & Ingestion Vault',
      subtitle: 'Inspect raw records, upload files & ZIP archives',
      icon: '📦',
      shortcut: '3',
      action: () => onSelectTab('DATA'),
    },
    {
      id: 'nav_search',
      category: 'NAVIGATION',
      title: 'Search & Forensic Filter Vault',
      subtitle: 'Tokenized multi-filter query search engine',
      icon: '🔍',
      shortcut: '4',
      action: () => onSelectTab('SEARCH'),
    },
    {
      id: 'nav_anomalies',
      category: 'NAVIGATION',
      title: 'Anomaly & Velocity Radar',
      subtitle: 'Forensic surge detector, hiatus gaps, and ghost contacts',
      icon: '🚨',
      shortcut: '5',
      action: () => onSelectTab('ANOMALIES'),
    },
    {
      id: 'nav_insights',
      category: 'NAVIGATION',
      title: 'Insights & Circadian Matrix',
      subtitle: 'Circadian radar, response velocity, and sentiment dynamics',
      icon: '💡',
      shortcut: '6',
      action: () => onSelectTab('INSIGHTS'),
    },
    {
      id: 'nav_topics',
      category: 'NAVIGATION',
      title: 'Topic Clusters & Thread Reconstructor',
      subtitle: 'Thematic grouping and session thread builder',
      icon: '🧠',
      shortcut: '7',
      action: () => onSelectTab('TOPICS'),
    },
    {
      id: 'nav_correlator',
      category: 'NAVIGATION',
      title: 'Multi-Stream Cross Correlator',
      subtitle: 'Differential comparison across two communication datasets',
      icon: '🔄',
      shortcut: '8',
      action: () => onSelectTab('CORRELATE'),
    },

    // 2. Exports
    {
      id: 'export_pdf',
      category: 'EXPORTS',
      title: 'Export Conversation Archive (PDF)',
      subtitle: 'Lossless streaming PDF with TrueType Unicode & SHA-256 verifier',
      icon: '📄',
      shortcut: 'E',
      action: () => onTriggerExport(),
    },

    // 3. Actions
    {
      id: 'action_assistant',
      category: 'ACTIONS',
      title: 'Open Local AI Intelligence Assistant',
      subtitle: 'Natural language queries, anomaly scans, and pattern discovery',
      icon: '🤖',
      shortcut: 'A',
      action: () => onOpenAssistant?.(),
    },
    {
      id: 'action_media_gallery',
      category: 'ACTIONS',
      title: 'Open Media & Attachment Gallery',
      subtitle: 'Browse photos, voice notes, stickers, and documents',
      icon: '📎',
      shortcut: 'M',
      action: () => onOpenMediaGallery?.(),
    },
    {
      id: 'action_lock',
      category: 'ACTIONS',
      title: 'Lock Workstation (PIN Screen)',
      subtitle: 'Secure screen session and mask data vault',
      icon: '🔒',
      shortcut: 'L',
      action: () => onOpenPinLock?.(),
    },

    // 4. Themes
    ...THEMES.map((t) => ({
      id: `theme_${t.id}`,
      category: 'THEMES' as const,
      title: `Theme: ${t.label}`,
      subtitle: t.desc,
      icon: t.icon,
      action: () => applyTheme(t.id),
    })),

    // 5. Datasets
    ...datasets.map((d) => ({
      id: `ds_${d.id}`,
      category: 'DATASETS' as const,
      title: `Switch Dataset: ${d.name}`,
      subtitle: `${d.totalEvents.toLocaleString()} records indexed`,
      icon: selectedDatasetId === d.id ? '✓' : '📁',
      action: () => onSelectDataset(d.id),
    })),
  ];

  // Filter based on query
  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl overflow-hidden backdrop-blur-2xl font-mono text-slate-100 z-10"
        >
          {/* Header Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-cyan-500/20 bg-slate-900/50">
            <span className="text-cyan-400 mr-3 text-sm">⌘</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command, search views, datasets, themes..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700">
              ESC to close
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching commands or views found for &quot;{query}&quot;
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border border-cyan-400/40 text-cyan-200'
                        : 'hover:bg-slate-900/60 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 font-normal">
                            {item.category}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.shortcut && (
                      <kbd className="flex-shrink-0 px-2 py-0.5 text-[10px] rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Bar */}
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/30 text-[10px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Dismiss</span>
            </div>
            <div className="text-cyan-400 font-bold">TextBoard Workstation v1.0</div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
