'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { TimelineView } from '../components/TimelineView';
import { ChatView } from '../components/ChatView';
import { WordCloudView } from '../components/WordCloudView';
import { FilterToolbar } from '../components/FilterToolbar';
import { ThemeToggle, ThemeMode } from '../components/ThemeToggle';
import { BootSequence } from '../components/BootSequence';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { HighlightsView } from '../components/HighlightsView';
import { PeopleView } from '../components/PeopleView';
import { CompareView } from '../components/CompareView';
import { OnThisDayView } from '../components/OnThisDayView';
import { PdfExportModal } from '../components/PdfExportModal';

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

type TabMode = 'chat' | 'highlights' | 'people' | 'compare' | 'on-this-day';
type AnalyzerType = 'text-chat' | 'spreadsheet' | 'document';

export default function DashboardPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('terminal');
  const [hasBooted, setHasBooted] = useState(false);

  // Active dataset state
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>('chat');

  // Analyzer selection state for upload
  const [analyzerType, setAnalyzerType] = useState<AnalyzerType>('text-chat');

  // PDF Export Modal state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Upload states
  const [files, setFiles] = useState<FileList | null>(null);
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
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setUploadError(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    let endpoint = `${apiUrl}/analyzers/text-chat/upload`;

    if (analyzerType === 'spreadsheet') {
      endpoint = `${apiUrl}/analyzers/spreadsheet/upload`;
      formData.append('file', files[0]);
    } else if (analyzerType === 'document') {
      endpoint = `${apiUrl}/analyzers/document/upload`;
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    } else {
      formData.append('file', files[0]);
    }

    try {
      const res = await fetch(endpoint, {
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
      setActiveTab('chat');
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

      {/* PDF Export Modal */}
      {dataset && (
        <PdfExportModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          datasetId={dataset.datasetId}
          apiUrl={apiUrl}
          selectedRange={selectedRange}
        />
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
                <span className="text-[11px] text-theme-dim">/ universal data platform</span>
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

          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle currentTheme={theme} onThemeChange={handleThemeChange} />

            {dataset && (
              <>
                <button
                  onClick={() => setPdfModalOpen(true)}
                  className="text-xs bg-theme-raised hover:bg-theme-active text-theme-accent border border-theme-border-hi/50 px-3 py-1.5 rounded-theme transition-colors font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-theme-glow"
                >
                  <span>📄</span>
                  <span>Export PDF</span>
                </button>

                <button
                  onClick={() => setDataset(null)}
                  className="text-xs bg-theme-raised hover:bg-theme-active text-theme-muted hover:text-theme-text border border-theme-border px-3 py-1.5 rounded-theme transition-colors font-medium"
                >
                  Upload New
                </button>
              </>
            )}
          </div>
        </header>

        {!dataset ? (
          /* Universal Upload View with Analyzer Selector */
          <div className="max-w-xl mx-auto my-12 border border-theme-border bg-theme-surface rounded-theme p-6 sm:p-8 shadow-xl terminal-interactive transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-theme-accent text-xs">&gt;</span>
              <h2 className="text-sm sm:text-base font-bold text-theme-text uppercase tracking-wide">
                Universal Dataset Ingestion
              </h2>
            </div>
            <p className="text-xs text-theme-muted mb-5">
              Select an analyzer module below. All inputs normalize automatically into the common Archive schema.
            </p>

            {/* Analyzer Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { id: 'text-chat', icon: '💬', label: 'Text Chat', desc: '.txt exports' },
                { id: 'spreadsheet', icon: '📊', label: 'Spreadsheet', desc: '.csv, .xlsx, .xls' },
                { id: 'document', icon: '📄', label: 'Documents', desc: '.pdf, .docx, notes' },
              ].map((m) => {
                const isSel = analyzerType === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAnalyzerType(m.id as AnalyzerType);
                      setFiles(null);
                      setUploadError(null);
                    }}
                    className={`p-3 rounded-theme border text-left transition-all ${
                      isSel
                        ? 'bg-theme-raised border-theme-border-hi text-theme-accent font-bold shadow-sm'
                        : 'bg-theme-base border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-raised'
                    }`}
                  >
                    <div className="text-base mb-1">{m.icon}</div>
                    <div className="text-xs font-bold text-theme-text">{m.label}</div>
                    <div className="text-[10px] text-theme-dim">{m.desc}</div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="border border-dashed border-theme-border bg-theme-base p-4 rounded-theme text-center">
                <input
                  id="upload-input"
                  type="file"
                  multiple={analyzerType === 'document'}
                  accept={
                    analyzerType === 'text-chat'
                      ? '.txt,text/plain'
                      : analyzerType === 'spreadsheet'
                      ? '.csv,.xlsx,.xls,.tsv'
                      : '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  }
                  onChange={handleFileChange}
                  className="w-full text-xs text-theme-muted file:mr-3 file:py-2 file:px-3 file:rounded-theme file:border-0 file:text-xs file:bg-theme-raised file:text-theme-text hover:file:bg-theme-active cursor-pointer"
                />
                {analyzerType === 'document' && (
                  <p className="text-[11px] text-theme-dim mt-2">
                    Multi-document mode enabled: select one or more files to analyze &amp; compare overlap.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || !files || files.length === 0}
                className="w-full py-2.5 bg-theme-raised hover:bg-theme-active disabled:opacity-50 text-theme-accent border border-theme-border-hi/60 text-xs font-bold uppercase tracking-wider rounded-theme transition-all shadow-theme-glow flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-theme-accent animate-ping" />
                    <span>Ingesting &amp; Normalizing into Schema...</span>
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
          /* Main Interactive Dashboard & Navigation (Universal for all Analyzers) */
          <div className="flex flex-col gap-5">
            {/* Tab Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-theme-border">
              {[
                { id: 'chat', label: '💬 Timeline & Event View' },
                { id: 'highlights', label: '🌟 Highlights & Milestones' },
                { id: 'people', label: '👥 People / Entities & Activity' },
                { id: 'compare', label: '⚖️ Compare Entities' },
                { id: 'on-this-day', label: '🕯 On This Day & Streaks' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabMode)}
                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-theme transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-theme-surface text-theme-accent border border-theme-border shadow-sm'
                        : 'text-theme-muted hover:text-theme-text hover:bg-theme-raised'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Chat / Records & Timeline */}
            {activeTab === 'chat' && (
              <div className="flex flex-col gap-4">
                <TimelineView
                  datasetId={dataset.datasetId}
                  apiUrl={apiUrl}
                  selectedRange={selectedRange}
                  onRangeSelect={setSelectedRange}
                  searchQuery={searchQuery}
                  activeWord={activeWord}
                  activeActor={activeActor}
                />

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

                <WordCloudView
                  datasetId={dataset.datasetId}
                  apiUrl={apiUrl}
                  activeWord={activeWord}
                  onSelectWord={setActiveWord}
                />

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

            {/* TAB 2: Highlights & Milestones */}
            {activeTab === 'highlights' && (
              <HighlightsView datasetId={dataset.datasetId} apiUrl={apiUrl} />
            )}

            {/* TAB 3: People / Entities & Response Times */}
            {activeTab === 'people' && (
              <PeopleView datasetId={dataset.datasetId} apiUrl={apiUrl} />
            )}

            {/* TAB 4: Compare Two Entities */}
            {activeTab === 'compare' && (
              <CompareView datasetId={dataset.datasetId} apiUrl={apiUrl} />
            )}

            {/* TAB 5: On This Day & Streaks */}
            {activeTab === 'on-this-day' && (
              <OnThisDayView datasetId={dataset.datasetId} apiUrl={apiUrl} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
