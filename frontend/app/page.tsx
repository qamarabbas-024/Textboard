'use client';

import React, { useState, useEffect } from 'react';
import { WorkstationNav, NavTab } from '../components/WorkstationNav';
import { HomeView } from '../components/HomeView';
import { DataView } from '../components/DataView';
import { ExploreView } from '../components/ExploreView';
import { SearchView } from '../components/SearchView';
import { InsightsView } from '../components/InsightsView';
import { ProcessingModal, IngestionJobState } from '../components/ProcessingModal';
import { BootSequence } from '../components/BootSequence';

interface DatasetItem {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export default function WorkstationPage() {
  const [currentTab, setCurrentTab] = useState<NavTab>('HOME');
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<IngestionJobState | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [isBootComplete, setIsBootComplete] = useState(false);

  // Fetch registered datasets
  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/v1/datasets');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.datasets || [];
        setDatasets(items);
        if (items.length > 0 && !selectedDatasetId) {
          setSelectedDatasetId(items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Fetch key insights for home view
  useEffect(() => {
    if (!selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }

    const targetId = selectedDatasetId || (datasets[0]?.id);
    if (!targetId) return;

    fetch(`/api/v1/analytics/${targetId}/insights`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.insights) {
          setInsights(data.insights);
        }
      })
      .catch((err) => console.error('Insights error:', err));
  }, [selectedDatasetId, datasets.length]);

  // Connect to SSE event stream when a job is active
  useEffect(() => {
    if (!activeJob || !activeJob.jobId || activeJob.status === 'COMPLETED' || activeJob.status === 'FAILED' || activeJob.status === 'CANCELLED') {
      return;
    }

    const eventSource = new EventSource(`/api/v1/jobs/${activeJob.jobId}/events`);

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        setActiveJob((prev) => (prev ? { ...prev, ...progressData } : progressData));

        if (progressData.status === 'COMPLETED') {
          eventSource.close();
          fetchDatasets();
        } else if (progressData.status === 'FAILED' || progressData.status === 'CANCELLED') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE progress event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeJob?.jobId]);

  const handleStartIngestionJob = (job: IngestionJobState) => {
    setActiveJob(job);
    setIsProcessingModalOpen(true);
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' });
      setActiveJob((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const totalRecordsCount = datasets.reduce((acc, d) => acc + (d.totalEvents || 0), 0);
  const totalParticipantsCount = datasets.reduce(
    (acc, d: any) => acc + (d.metrics?.participantCount || 0),
    0,
  ) || (datasets.length > 0 ? datasets.length * 2 : 0);

  return (
    <div className="min-h-screen bg-theme-base text-theme-text selection:bg-theme-accent/30 selection:text-theme-text transition-colors duration-200">
      {/* 0. High-Tech Terminal Boot Diagnostics (Initial Visit) */}
      {!isBootComplete && (
        <BootSequence onComplete={() => setIsBootComplete(true)} />
      )}

      {/* 1. Top Workstation Navigation */}
      <WorkstationNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeJob={activeJob?.status === 'PROCESSING' ? activeJob : null}
        datasetCount={datasets.length}
        totalRecords={totalRecordsCount}
        onOpenProcessingModal={() => setIsProcessingModalOpen(true)}
      />

      {/* 2. Main Workstation Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'HOME' && (
          <HomeView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            onNavigateTo={setCurrentTab}
            insights={insights}
            totalRecordsCount={totalRecordsCount}
            totalParticipantsCount={totalParticipantsCount}
          />
        )}

        {currentTab === 'DATA' && (
          <DataView
            datasets={datasets}
            onDatasetDeleted={(id) => {
              setDatasets((prev) => prev.filter((d) => d.id !== id));
              if (selectedDatasetId === id) {
                setSelectedDatasetId(datasets.find((d) => d.id !== id)?.id || null);
              }
            }}
            onExploreDataset={(id) => {
              setSelectedDatasetId(id);
              setCurrentTab('EXPLORE');
            }}
            onStartIngestionJob={handleStartIngestionJob}
          />
        )}

        {currentTab === 'EXPLORE' && (
          <ExploreView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
          />
        )}

        {currentTab === 'SEARCH' && (
          <SearchView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
          />
        )}

        {currentTab === 'INSIGHTS' && (
          <InsightsView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
          />
        )}
      </main>

      {/* 3. Real-Time Processing Modal */}
      <ProcessingModal
        isOpen={isProcessingModalOpen}
        job={activeJob}
        onClose={() => setIsProcessingModalOpen(false)}
        onExploreDataset={(id) => {
          setSelectedDatasetId(id);
          setIsProcessingModalOpen(false);
          setCurrentTab('EXPLORE');
        }}
        onCancelJob={handleCancelJob}
      />
    </div>
  );
}
