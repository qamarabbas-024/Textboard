'use client';

import React, { useState, useEffect } from 'react';
import { WorkstationNav, NavTab } from '../components/WorkstationNav';
import { HomeView } from '../components/HomeView';
import { DataView } from '../components/DataView';
import { ExploreView } from '../components/ExploreView';
import { SearchView } from '../components/SearchView';
import { InsightsView } from '../components/InsightsView';
import { AnomalyView } from '../components/AnomalyView';
import { TopicClusterView } from '../components/TopicClusterView';
import { CrossCorrelatorView } from '../components/CrossCorrelatorView';
import { ProcessingModal, IngestionJobState } from '../components/ProcessingModal';
import { BootSequence } from '../components/BootSequence';
import { CommandPalette } from '../components/CommandPalette';
import { PdfExportModal } from '../components/PdfExportModal';
import { PinLockModal } from '../components/PinLockModal';
import { MediaGalleryModal } from '../components/MediaGalleryModal';
import { LocalAssistantDrawer } from '../components/LocalAssistantDrawer';
import { SpatialUniverseView } from '../components/SpatialUniverseView';
import { GeoMapView } from '../components/GeoMapView';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MobileServerModal } from '../components/MobileServerModal';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { safeFetch } from '../lib/api-client';
import BackgroundEffect from '../components/BackgroundEffect';

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isMobileServerOpen, setIsMobileServerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [isBootComplete, setIsBootComplete] = useState(false);

  // Fetch registered datasets
  const fetchDatasets = async () => {
    try {
      const res = await safeFetch('/api/v1/datasets');
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

    safeFetch(`/api/v1/analytics/${targetId}/insights`)
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

  // Global Keyboard Shortcuts (Ctrl+K, Numbers 1-8, E, /, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsPdfExportModalOpen(false);
        setIsMediaGalleryOpen(false);
        setIsAssistantOpen(false);
        setIsProcessingModalOpen(false);
        setIsShortcutsOpen(false);
        return;
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (!isInput && !isCommandPaletteOpen && !isPdfExportModalOpen && !isMediaGalleryOpen && !isAssistantOpen && !isProcessingModalOpen && !isShortcutsOpen) {
        if (e.key === '1') setCurrentTab('HOME');
        else if (e.key === '2') setCurrentTab('EXPLORE');
        else if (e.key === '3') setCurrentTab('DATA');
        else if (e.key === '4') setCurrentTab('SEARCH');
        else if (e.key === '5') setCurrentTab('ANOMALIES');
        else if (e.key === '6') setCurrentTab('INSIGHTS');
        else if (e.key === '7') setCurrentTab('TOPICS');
        else if (e.key === '8') setCurrentTab('CORRELATE');
        else if (e.key === '9') setCurrentTab('SPATIAL');
        else if (e.key === '/') {
          e.preventDefault();
          setCurrentTab('SEARCH');
        } else if (e.key.toLowerCase() === 'a' && selectedDatasetId) {
          e.preventDefault();
          setIsAssistantOpen((prev) => !prev);
        } else if (e.key.toLowerCase() === 'e' && selectedDatasetId) {
          e.preventDefault();
          setIsPdfExportModalOpen(true);
        } else if (e.key.toLowerCase() === 'm' && selectedDatasetId) {
          e.preventDefault();
          setIsMediaGalleryOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isPdfExportModalOpen, isMediaGalleryOpen, isAssistantOpen, isProcessingModalOpen, isShortcutsOpen, selectedDatasetId]);

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

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  return (
    <div className="min-h-screen bg-theme-base text-theme-text font-mono relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Perspective Grid & Particle Background */}
      <BackgroundEffect />

      {/* Boot Sequence Animation */}
      {!isBootComplete && (
        <BootSequence onComplete={() => setIsBootComplete(true)} />
      )}

      {/* Local Convenience PIN Lock Modal */}
      {isLocked && (
        <PinLockModal
          isLocked={isLocked}
          onUnlock={() => setIsLocked(false)}
          onPinConfigured={() => {}}
        />
      )}

      {/* 1. Top Workstation Navigation */}
      <WorkstationNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeJob={activeJob?.status === 'PROCESSING' ? activeJob : null}
        datasetCount={datasets.length}
        totalRecords={totalRecordsCount}
        onOpenProcessingModal={() => setIsProcessingModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenMobileServer={() => setIsMobileServerOpen(true)}
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

        {currentTab === 'ANOMALIES' && selectedDatasetId && (
          <AnomalyView
            datasetId={selectedDatasetId}
            datasetName={activeDataset?.name}
            onExploreDate={() => setCurrentTab('EXPLORE')}
          />
        )}

        {currentTab === 'TOPICS' && selectedDatasetId && (
          <TopicClusterView
            datasetId={selectedDatasetId}
            datasetName={activeDataset?.name}
            onExploreDate={() => setCurrentTab('EXPLORE')}
          />
        )}

        {currentTab === 'CORRELATE' && (
          <CrossCorrelatorView datasets={datasets} />
        )}

        {currentTab === 'GEOMAP' && selectedDatasetId && (
          <GeoMapView
            datasetId={selectedDatasetId}
          />
        )}

        {currentTab === 'SPATIAL' && selectedDatasetId && (
          <SpatialUniverseView
            datasetId={selectedDatasetId}
            datasetName={activeDataset?.name || 'Dataset'}
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

      {/* 4. Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setCurrentTab}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={(id) => {
          setSelectedDatasetId(id);
          setIsCommandPaletteOpen(false);
        }}
        onTriggerExport={() => {
          setIsCommandPaletteOpen(false);
          setIsPdfExportModalOpen(true);
        }}
        onOpenMediaGallery={() => {
          setIsCommandPaletteOpen(false);
          setIsMediaGalleryOpen(true);
        }}
        onOpenAssistant={() => {
          setIsCommandPaletteOpen(false);
          setIsAssistantOpen(true);
        }}
        onOpenPinLock={() => {
          setIsCommandPaletteOpen(false);
          setIsLocked(true);
        }}
      />

      {/* 5. Lossless PDF Export Modal */}
      {selectedDatasetId && activeDataset && (
        <PdfExportModal
          isOpen={isPdfExportModalOpen}
          onClose={() => setIsPdfExportModalOpen(false)}
          datasetId={selectedDatasetId}
          datasetName={activeDataset.name}
          totalEvents={activeDataset.totalEvents || 0}
        />
      )}

      {/* 6. Media & Attachment Gallery Modal */}
      {selectedDatasetId && activeDataset && (
        <MediaGalleryModal
          isOpen={isMediaGalleryOpen}
          onClose={() => setIsMediaGalleryOpen(false)}
          datasetId={selectedDatasetId}
          datasetName={activeDataset.name}
        />
      )}

      {/* 7. Local AI Intelligence Assistant Drawer */}
      {selectedDatasetId && activeDataset && (
        <LocalAssistantDrawer
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          datasetId={selectedDatasetId}
          datasetName={activeDataset.name}
        />
      )}

      {/* 8. Native Android & Mobile Responsive Bottom Navigation */}
      <MobileBottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* 9. Mobile Remote Workstation Server Bridge Modal */}
      <MobileServerModal
        isOpen={isMobileServerOpen}
        onClose={() => setIsMobileServerOpen(false)}
        onRefresh={fetchDatasets}
      />

      {/* 10. Global Keyboard Shortcuts & Accessibility Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

