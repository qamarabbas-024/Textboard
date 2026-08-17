'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

interface AnalysisResult {
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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/analyzers/text-chat/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Upload failed with status ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Text Chat Analyzer</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="chat-file">Select chat export (.txt): </label>
          <input
            id="chat-file"
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
          />
        </div>

        <button type="submit" disabled={loading || !file}>
          {loading ? 'Processing...' : 'Upload and Analyze'}
        </button>
      </form>

      {error && (
        <div>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div>
          <h2>Analysis Results</h2>
          <p><strong>Dataset ID:</strong> {result.datasetId}</p>
          <p><strong>Dataset Name:</strong> {result.name}</p>
          <p><strong>Total Messages:</strong> {result.totalMessages}</p>
          <p>
            <strong>Date Range:</strong> {result.dateRange.start || 'N/A'} to {result.dateRange.end || 'N/A'}
          </p>
          <p><strong>Processing Time:</strong> {result.processingTimeMs} ms</p>

          <h3>Message Count Per Sender:</h3>
          <ul>
            {Object.entries(result.actorCounts).map(([actor, count]) => (
              <li key={actor}>
                {actor}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
