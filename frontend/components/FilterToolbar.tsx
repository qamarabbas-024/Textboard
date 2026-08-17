'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRange: { start: string | null; end: string | null };
  onClearRange: () => void;
  activeWord: string | null;
  onClearWord: () => void;
  activeActor: string | null;
  onClearActor: () => void;
  onResetAll: () => void;
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  selectedRange,
  onClearRange,
  activeWord,
  onClearWord,
  activeActor,
  onClearActor,
  onResetAll,
}: FilterToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const hasAnyFilter = Boolean(
    searchQuery || (selectedRange.start && selectedRange.end) || activeWord || activeActor,
  );

  return (
    <div className="flex flex-col gap-2 mb-4 bg-theme-surface border border-theme-border p-3.5 rounded-theme terminal-interactive shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-dim text-xs select-none">
            &gt;
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search messages (press typing to filter)..."
            className="w-full bg-theme-base border border-theme-border rounded-theme pl-8 pr-8 py-2 text-xs sm:text-sm text-theme-text placeholder-theme-dim focus:outline-none focus:border-theme-border-hi transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-muted hover:text-theme-text"
            >
              ✕
            </button>
          )}
        </div>

        {hasAnyFilter && (
          <button
            onClick={onResetAll}
            className="text-xs bg-rose-950/80 border border-rose-800 text-rose-300 px-3 py-2 rounded-theme hover:bg-rose-900 transition-colors whitespace-nowrap font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      <AnimatePresence>
        {hasAnyFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap text-xs pt-1.5 border-t border-theme-border"
          >
            <span className="text-theme-dim text-[11px] uppercase tracking-wider font-semibold">
              Active:
            </span>

            {searchQuery && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 bg-theme-raised border border-theme-border text-theme-text px-2 py-0.5 rounded-theme text-xs"
              >
                Search: &ldquo;{searchQuery}&rdquo;
                <button
                  onClick={() => {
                    setLocalSearch('');
                    onSearchChange('');
                  }}
                  className="hover:text-theme-accent font-bold"
                >
                  ✕
                </button>
              </motion.span>
            )}

            {selectedRange.start && selectedRange.end && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 bg-theme-raised border border-theme-border-hi/50 text-theme-accent px-2 py-0.5 rounded-theme text-xs font-medium shadow-sm"
              >
                Timeline: {new Date(selectedRange.start).toLocaleDateString()} –{' '}
                {new Date(selectedRange.end).toLocaleDateString()}
                <button onClick={onClearRange} className="hover:text-white font-bold">
                  ✕
                </button>
              </motion.span>
            )}

            {activeWord && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 bg-theme-raised border border-theme-border text-theme-text px-2 py-0.5 rounded-theme text-xs"
              >
                Entity: {activeWord}
                <button onClick={onClearWord} className="hover:text-theme-accent font-bold">
                  ✕
                </button>
              </motion.span>
            )}

            {activeActor && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 bg-theme-raised border border-theme-border text-theme-text px-2 py-0.5 rounded-theme text-xs"
              >
                Sender: {activeActor}
                <button onClick={onClearActor} className="hover:text-theme-accent font-bold">
                  ✕
                </button>
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
