'use client';

import React, { useState, useEffect } from 'react';

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
    <div className="flex flex-col gap-2 mb-4 bg-zinc-900 border border-zinc-700 p-3 rounded">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search messages by keyword or phrase..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>

        {hasAnyFilter && (
          <button
            onClick={onResetAll}
            className="text-xs bg-rose-950 border border-rose-800 text-rose-300 px-3 py-1.5 rounded hover:bg-rose-900 transition-colors whitespace-nowrap"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {hasAnyFilter && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-zinc-800">
          <span className="text-zinc-500 font-medium">Active Filters:</span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
              Search: &ldquo;{searchQuery}&rdquo;
              <button
                onClick={() => {
                  setLocalSearch('');
                  onSearchChange('');
                }}
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          )}

          {selectedRange.start && selectedRange.end && (
            <span className="inline-flex items-center gap-1 bg-indigo-950 border border-indigo-700 text-indigo-300 px-2 py-0.5 rounded">
              Timeline: {new Date(selectedRange.start).toLocaleDateString()} –{' '}
              {new Date(selectedRange.end).toLocaleDateString()}
              <button onClick={onClearRange} className="hover:text-white">
                ✕
              </button>
            </span>
          )}

          {activeWord && (
            <span className="inline-flex items-center gap-1 bg-purple-950 border border-purple-700 text-purple-300 px-2 py-0.5 rounded">
              Word: {activeWord}
              <button onClick={onClearWord} className="hover:text-white">
                ✕
              </button>
            </span>
          )}

          {activeActor && (
            <span className="inline-flex items-center gap-1 bg-teal-950 border border-teal-700 text-teal-300 px-2 py-0.5 rounded">
              Sender: {activeActor}
              <button onClick={onClearActor} className="hover:text-white">
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
