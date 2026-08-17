'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { TimelineView } from '../components/TimelineView';
import { ChatView } from '../components/ChatView';
import { WordCloudView } from '../components/WordCloudView';
import { FilterToolbar } from '../components/FilterToolbar';
import { ThemeToggle, ThemeMode } from '../components/ThemeToggle';
import { BootSequence } from '../components/BootSequence';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface DatasetMetadata {
  datasetId: string;
  name: string;
  totalMessages: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  actorCounts: Record<string, number>;
  processingTimeMs: number;
}

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('terminal');
  const [hasBooted, setHasBooted] = useState(false);

  // Active dataset state
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);

  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Interactive filter states
  const [selectedRange, setSelectedRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [activeActor, setActiveActor] = useState<string | null>(null);

  // Initialize theme from storage or default to terminal
  useEffect(() => {
    const savedTheme = (localStorage.getItem('archive_theme') as ThemeMode) || 'terminal';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const booted = sessionStorage.getItem('archive_booted');
    if (booted || savedTheme !== 'terminal') {
      setHasBooted(true);
    }
  }, []);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('archive_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleBootComplete = () => {
    setHasBooted(true);
    sessionStorage.setItem('archive_booted', 'true');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${apiUrl}/analyzers/text-chat/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed with status ${res.status}`);
      }

      const data: DatasetMetadata = await res.json();
      setDataset(data);
      setSelectedRange({ start: null, end: null });
      setSearchQuery('');
      setActiveWord(null);
      setActiveActor(null);
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleResetAllFilters = () => {
    setSelectedRange({ start: null, end: null });
    setSearchQuery('');
    setActiveWord(null);
    setActiveActor(null);
  };

  return (
    <div className="min-h-screen relative terminal-grid transition-colors">
      {/* Scanline overlay for Terminal theme */}
      <div className="fixed inset-0 terminal-scanline pointer-events-none z-40 opacity-40" />

      {/* Boot sequence animation on first load */}
      {!hasBooted && theme === 'terminal' && (
        <BootSequence onComplete={handleBootComplete} />
      )}

      <main className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-theme bg-theme-raised border border-theme-border flex items-center justify-center font-bold text-theme-accent text-sm shadow-sm">
              ▲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-theme-text uppercase">
                  Archive
                </h1>
                <span className="text-[11px] text-theme-dim">/ text-chat-analyzer</span>
                <span className="inline-block w-1.5 h-3 bg-theme-accent animate-cursor ml-0.5" />
              </div>
              {dataset && (
                <p className="text-xs text-theme-muted mt-0.5">
                  Dataset:{' '}
                  <span className="text-theme-text font-semibold">{dataset.name}</span> &bull;{' '}
                  <span className="text-theme-accent font-mono font-medium">
                    <AnimatedCounter value={dataset.totalMessages} />
                  </span>{' '}
                  events
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle currentTheme={theme} onThemeChange={handleThemeChange} />

            {dataset && (
              <button
                onClick={() => setDataset(null)}
                className="text-xs bg-theme-raised hover:bg-theme-active text-theme-text border border-theme-border px-3 py-1.5 rounded-theme transition-colors font-medium"
              >
                Upload New File
              </button>
            )}
          </div>
        </header>

        {!dataset ? (
          /* Upload View */
          <div className="max-w-lg mx-auto my-16 border border-theme-border bg-theme-surface rounded-theme p-6 sm:p-8 shadow-xl terminal-interactive transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-theme-accent text-xs">&gt;</span>
              <h2 className="text-sm sm:text-base font-bold text-theme-text uppercase tracking-wide">
                Ingest Chat Export
              </h2>
            </div>
            <p className="text-xs text-theme-muted mb-6">
              Select a plain text (.txt) chat export file. Streamed line-by-line into PostgreSQL and Redis.
            </p>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="border border-dashed border-theme-border bg-theme-base p-4 rounded-theme text-center">
                <input
                  id="upload-input"
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileChange}
                  className="w-full text-xs text-theme-muted file:mr-3 file:py-2 file:px-3 file:rounded-theme file:border-0 file:text-xs file:bg-theme-raised file:text-theme-text hover:file:bg-theme-active cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-2.5 bg-theme-raised hover:bg-theme-active disabled:opacity-50 text-theme-accent border border-theme-border-hi/60 text-xs font-bold uppercase tracking-wider rounded-theme transition-all shadow-theme-glow flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-theme-accent animate-ping" />
                    <span>Parsing &amp; Ingesting...</span>
                  </>
                ) : (
                  <span>Process Dataset</span>
                )}
              </button>
            </form>

            {uploadError && (
              <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-theme">
                {uploadError}
              </div>
            )}
          </div>
        ) : (
          /* Interactive Dashboard */
          <div className="flex flex-col gap-4">
            {/* 1. Animated Timeline with Range Filter */}
            <TimelineView
              datasetId={dataset.datasetId}
              apiUrl={apiUrl}
              selectedRange={selectedRange}
              onRangeSelect={setSelectedRange}
              searchQuery={searchQuery}
              activeWord={activeWord}
              activeActor={activeActor}
            />

            {/* 2. Filter Toolbar (Search & Active Filters) */}
            <FilterToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedRange={selectedRange}
              onClearRange={() => setSelectedRange({ start: null, end: null })}
              activeWord={activeWord}
              onClearWord={() => setActiveWord(null)}
              activeActor={activeActor}
              onClearActor={() => setActiveActor(null)}
              onResetAll={handleResetAllFilters}
            />

            {/* 3. Word & Emoji Frequencies (Redis Cached) */}
            <WordCloudView
              datasetId={dataset.datasetId}
              apiUrl={apiUrl}
              activeWord={activeWord}
              onSelectWord={setActiveWord}
            />

            {/* 4. Virtualized Infinite-Scroll Chat View */}
            <ChatView
              datasetId={dataset.datasetId}
              apiUrl={apiUrl}
              selectedRange={selectedRange}
              searchQuery={searchQuery}
              activeWord={activeWord}
              activeActor={activeActor}
              onSelectActor={setActiveActor}
            />
          </div>
        )}
      </main>
    </div>
  );
}
