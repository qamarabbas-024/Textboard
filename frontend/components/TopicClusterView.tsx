'use client';

import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  MessageSquareIcon,
  UsersIcon,
  ClockIcon,
  FileTextIcon,
  RefreshCwIcon,
  TerminalIcon,
} from './Icons';
import { Button } from './ui/Button';

interface TopicCluster {
  id: string;
  name: string;
  category: string;
  icon: string;
  messageCount: number;
  percentage: number;
  topKeywords: Array<{ word: string; weight: number }>;
  topParticipants: Array<{ actor: string; count: number }>;
  sampleMessages: Array<{
    id: string;
    actor: string | null;
    timestamp: string;
    content: string;
  }>;
}

interface ConversationThread {
  id: string;
  topicTitle: string;
  initiator: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  messageCount: number;
  participants: string[];
  sampleMessages: Array<{
    id: string;
    actor: string | null;
    timestamp: string;
    content: string;
  }>;
}

interface TopicClusterViewProps {
  datasetId: string;
  datasetName?: string;
  onExploreDate?: (date: string) => void;
}

export function TopicClusterView({ datasetId, datasetName, onExploreDate }: TopicClusterViewProps) {
  const [activeTab, setActiveTab] = useState<'TOPICS' | 'THREADS'>('TOPICS');
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    if (!datasetId) return;
    setIsLoading(true);
    try {
      const [topicsRes, threadsRes] = await Promise.all([
        fetch(`/api/v1/analytics/${datasetId}/topics`),
        fetch(`/api/v1/analytics/${datasetId}/threads`),
      ]);

      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setClusters(topicsData.clusters || []);
        if (topicsData.clusters?.length > 0) {
          setSelectedClusterId(topicsData.clusters[0].id);
        }
      }

      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        setThreads(threadsData.threads || []);
      }
    } catch (err) {
      console.error('Topic clusters fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [datasetId]);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId) || clusters[0];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Mode Switcher */}
      <section className="p-6 rounded-xl border border-theme-border bg-theme-surface shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">
                SEMANTIC TOPIC CLUSTERING &amp; THREAD RECONSTRUCTION
              </h2>
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[10px] font-bold border border-purple-500/30">
                V3.0 ENGINE
              </span>
            </div>
            <p className="text-xs text-theme-dim mt-0.5">
              Deterministic topic extraction, keyword co-occurrence vectors, and temporal thread grouping
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-theme-base p-1 rounded-lg border border-theme-border text-xs">
              <button
                onClick={() => setActiveTab('TOPICS')}
                className={`px-3 py-1.5 rounded-md font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'TOPICS'
                    ? 'bg-theme-active text-theme-accent border border-theme-border-hi'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                THEMATIC CLUSTERS
              </button>
              <button
                onClick={() => setActiveTab('THREADS')}
                className={`px-3 py-1.5 rounded-md font-semibold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'THREADS'
                    ? 'bg-theme-active text-theme-accent border border-theme-border-hi'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                SMART THREADS ({threads.length})
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="w-3.5 h-3.5" />}
            >
              Re-cluster
            </Button>
          </div>
        </div>
      </section>

      {/* Mode 1: Thematic Topic Clusters */}
      {activeTab === 'TOPICS' && (
        <div className="space-y-6">
          {/* Cluster Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              return (
                <div
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-theme-raised border-theme-accent shadow-theme-glow'
                      : 'bg-theme-surface border-theme-border hover:border-theme-border-hi'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cluster.icon}</span>
                      <div>
                        <h3 className="font-bold text-xs text-theme-text">{cluster.name}</h3>
                        <span className="text-[10px] text-theme-dim uppercase font-semibold">
                          {cluster.percentage}% of Archive
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-theme-accent font-bold text-xs">
                      {cluster.messageCount.toLocaleString()} msgs
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-theme-base rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-theme-accent h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, cluster.percentage))}%` }}
                    />
                  </div>

                  {/* Keywords Preview */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cluster.topKeywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw.word}
                        className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-[10px] text-theme-muted"
                      >
                        {kw.word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Cluster Deep-Dive */}
          {selectedCluster && (
            <div className="p-6 rounded-xl border border-theme-border bg-theme-surface space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCluster.icon}</span>
                  <div>
                    <h3 className="text-base font-bold text-theme-text">{selectedCluster.name}</h3>
                    <p className="text-xs text-theme-dim">
                      {selectedCluster.messageCount.toLocaleString()} messages ({selectedCluster.percentage}% of stream)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-dim">Dominant Actors:</span>
                  <div className="flex items-center gap-1.5">
                    {selectedCluster.topParticipants.slice(0, 3).map((p) => (
                      <span
                        key={p.actor}
                        className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-[11px] text-theme-text"
                      >
                        {p.actor} ({p.count})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Keyword Vector Cloud */}
              <div>
                <h4 className="text-xs font-semibold text-theme-dim uppercase tracking-wider mb-2">
                  Topic Keyword Relevance Vector
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCluster.topKeywords.map((kw) => (
                    <span
                      key={kw.word}
                      className="px-3 py-1 rounded-lg bg-theme-base border border-theme-border text-xs text-theme-text font-medium"
                    >
                      <strong className="text-theme-accent">{kw.word}</strong>
                      <span className="text-[10px] text-theme-dim ml-1.5">({kw.weight})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Messages in this Cluster */}
              <div>
                <h4 className="text-xs font-semibold text-theme-dim uppercase tracking-wider mb-2">
                  Sample Discussion Excerpts
                </h4>
                <div className="space-y-2">
                  {selectedCluster.sampleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-lg bg-theme-base border border-theme-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-theme-dim">
                        <strong className="text-theme-accent">{msg.actor || 'Unknown'}</strong>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-theme-text font-sans">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Reconstructed Conversation Threads */}
      {activeTab === 'THREADS' && (
        <div className="space-y-4">
          {threads.length === 0 ? (
            <div className="p-12 text-center text-xs text-theme-dim rounded-xl border border-theme-border bg-theme-surface">
              {isLoading ? 'Reconstructing discussion threads...' : 'No multi-message threads identified in this archive.'}
            </div>
          ) : (
            threads.map((thread) => {
              const isExpanded = expandedThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  className="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-border-hi transition-all space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-theme-active border border-theme-border-hi text-theme-accent font-bold text-[10px]">
                        THREAD ({thread.messageCount} MSGS)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-theme-muted text-[11px]">
                        Duration: <strong className="text-theme-text">{thread.durationMinutes} mins</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-theme-dim">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{new Date(thread.startTime).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-theme-text text-sm mb-1">{thread.topicTitle}</h3>
                    <div className="flex items-center gap-2 text-xs text-theme-dim">
                      <span>Initiated by: <strong className="text-theme-text">{thread.initiator}</strong></span>
                      <span>•</span>
                      <span>Participants: {thread.participants.join(', ')}</span>
                    </div>
                  </div>

                  {/* Thread Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-theme-border">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setExpandedThreadId(isExpanded ? null : thread.id)}
                    >
                      {isExpanded ? 'Hide Discussion Excerpts ▲' : 'View Discussion Excerpts ▼'}
                    </Button>

                    {onExploreDate && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => onExploreDate(thread.startTime)}
                      >
                        Explore in Timeline →
                      </Button>
                    )}
                  </div>

                  {/* Expanded Messages */}
                  {isExpanded && (
                    <div className="p-4 rounded-lg bg-theme-base border border-theme-border space-y-2.5 animate-fadeIn">
                      {thread.sampleMessages.map((msg) => (
                        <div key={msg.id} className="p-2.5 rounded bg-theme-surface border border-theme-border text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-theme-dim">
                            <strong className="text-theme-accent">{msg.actor || 'User'}</strong>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-theme-text font-sans">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
