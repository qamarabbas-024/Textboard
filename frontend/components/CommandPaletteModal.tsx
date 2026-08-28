'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CommandAction {
  id: string;
  title: string;
  category: 'Navigation' | 'Action' | 'Theme' | 'Search';
  shortcut?: string;
  icon: string;
  onExecute: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions?: CommandAction[];
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  actions = [],
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global key listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const defaultActions: CommandAction[] = [
    {
      id: 'act_pdf',
      title: 'Export PDF Forensic Dossier',
      category: 'Action',
      shortcut: 'Ctrl+E',
      icon: '📄',
      onExecute: () => {},
    },
    {
      id: 'act_assistant',
      title: 'Ask Local AI Intelligence Assistant',
      category: 'Action',
      shortcut: 'Ctrl+A',
      icon: '🤖',
      onExecute: () => {},
    },
    {
      id: 'act_merge',
      title: 'Merge Multi-App Data Streams',
      category: 'Action',
      shortcut: 'Ctrl+M',
      icon: '🔀',
      onExecute: () => {},
    },
    {
      id: 'act_theme_cyber',
      title: 'Switch Theme: Cyber Hyperdrive',
      category: 'Theme',
      icon: '⚡',
      onExecute: () => {
        document.documentElement.setAttribute('data-theme', 'cyberpunk');
      },
    },
    {
      id: 'act_theme_matrix',
      title: 'Switch Theme: Emerald Quantum Matrix',
      category: 'Theme',
      icon: '🟢',
      onExecute: () => {
        document.documentElement.setAttribute('data-theme', 'matrix');
      },
    },
    {
      id: 'act_theme_amber',
      title: 'Switch Theme: Solarized Amber Terminal',
      category: 'Theme',
      icon: '📟',
      onExecute: () => {
        document.documentElement.setAttribute('data-theme', 'amber');
      },
    },
    {
      id: 'act_spatial',
      title: 'Open 3D Spatial Universe Explorer',
      category: 'Navigation',
      icon: '🪐',
      onExecute: () => {},
    },
  ];

  const allActions = actions.length > 0 ? actions : defaultActions;
  const filtered = allActions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].onExecute();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/75 backdrop-blur-sm font-mono text-theme-text">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          className="w-full max-w-xl bg-theme-surface border border-theme-border rounded-3xl p-4 shadow-2xl flex flex-col gap-3"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-theme-raised border border-theme-border">
            <span className="text-theme-accent text-sm">🔍</span>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownInInput}
              placeholder="Type a command, theme, or action (e.g. 'export', 'theme', 'ai')..."
              className="w-full bg-transparent text-xs text-theme-text placeholder-theme-dim outline-none"
            />
            <kbd className="px-2 py-0.5 rounded-md bg-theme-base border border-theme-border text-[9px] text-theme-dim">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-theme-dim">
                No matching commands found.
              </div>
            ) : (
              filtered.map((action, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={action.id}
                    onClick={() => {
                      action.onExecute();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-theme-raised border-theme-accent/70 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-theme-raised/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{action.icon}</span>
                      <div>
                        <span className="font-bold text-theme-text block">{action.title}</span>
                        <span className="text-[10px] text-theme-dim">{action.category}</span>
                      </div>
                    </div>
                    {action.shortcut && (
                      <kbd className="px-2 py-0.5 rounded-lg bg-theme-base border border-theme-border text-[9px] text-theme-accent">
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="flex items-center justify-between pt-2 border-t border-theme-border text-[10px] text-theme-dim px-1">
            <span>Use ↑↓ to navigate • ↵ to select</span>
            <span>Ctrl+K to toggle</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
