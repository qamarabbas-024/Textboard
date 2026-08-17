'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { TimelineView } from '../components/TimelineView';
import { ChatView } from '../components/ChatView';
import { WordCloudView } from '../components/WordCloudView';
import { FilterToolbar } from '../components/FilterToolbar';

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
      // Reset filters
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Archive <span className="text-zinc-500 font-normal text-sm">/ text-chat-analyzer</span>
          </h1>
          {dataset && (
            <p className="text-xs text-zinc-400 mt-1">
              Dataset: <span className="text-zinc-200 font-medium">{dataset.name}</span> &bull;{' '}
              {dataset.totalMessages.toLocaleString()} total events
            </p>
          )}
        </div>

        {dataset && (
          <button
            onClick={() => setDataset(null)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded transition-colors"
          >
            Upload New File
          </button>
        )}
      </header>

      {!dataset ? (
        /* Upload View */
        <div className="max-w-md mx-auto my-16 border border-zinc-800 bg-zinc-900 rounded p-6 shadow-xl">
          <h2 className="text-base font-semibold mb-4 text-zinc-100">Upload Text Chat Export</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div>
              <label htmlFor="upload-input" className="block text-xs text-zinc-400 mb-2">
                Select .txt chat file export:
              </label>
              <input
                id="upload-input"
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileChange}
                className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors"
            >
              {uploading ? 'Processing & Ingesting...' : 'Upload & Analyze'}
            </button>
          </form>

          {uploadError && (
            <div className="mt-4 p-3 bg-rose-950 border border-rose-800 text-rose-300 text-xs rounded">
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        /* Interactive Dashboard */
        <div className="flex flex-col gap-4">
          {/* 1. Timeline Volume with Range Filter */}
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

          {/* 3. Word & Emoji Frequencies */}
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
  );
}
