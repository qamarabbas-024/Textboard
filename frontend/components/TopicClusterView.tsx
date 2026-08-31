'use client';

import React, { useState, useEffect } from 'react';
import { safeFetch } from '../lib/api-client';
import {
  SparklesIcon,
  MessageSquareIcon,
  UsersIcon,
  ClockIcon,
  RefreshCwIcon,
} from './Icons';
import { Button } from './ui/Button';
import TopicBubbleChart, { TopicBubble } from './charts/TopicBubbleChart';
import { WordCloudView } from './WordCloudView';

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
  const [activeTab, setActiveTab] = useState<'TOPICS' | 'THREADS' | 'WORDCLOUD'>('TOPICS');
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
        safeFetch(`/api/v1/analytics/${datasetId}/topics`),
        safeFetch(`/api/v1/analytics/${datasetId}/threads`),
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

  const topicBubbles: TopicBubble[] = clusters.map((c) => ({
    id: c.id,
    category: c.category,
    label: c.name,
    count: c.messageCount,
    keywords: c.topKeywords.map((k) => k.word),
  }));

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header & Mode Switcher */}
      <section className="glass-card-3d p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                SEMANTIC TOPIC CLUSTERING &amp; THREAD RECONSTRUCTION
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/40">
                V5.0 ENGINE
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              Deterministic topic extraction, keyword co-occurrence vectors, and temporal thread grouping
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-theme-border text-xs">
              <button
                onClick={() => setActiveTab('TOPICS')}
                className={`px-3 py-1.5 rounded-lg font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'TOPICS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'text-theme-muted hover:text-white'
                }`}
              >
                THEMATIC CLUSTERS
              </button>
              <button
                onClick={() => setActiveTab('WORDCLOUD')}
                className={`px-3 py-1.5 rounded-lg font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'WORDCLOUD'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'text-theme-muted hover:text-white'
                }`}
              >
                WORD CLOUD
              </button>
              <button
                onClick={() => setActiveTab('THREADS')}
                className={`px-3 py-1.5 rounded-lg font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'THREADS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'text-theme-muted hover:text-white'
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

      {/* 1. Thematic Topic Bubble Chart Diagram */}
      {topicBubbles.length > 0 && (
        <TopicBubbleChart
          topics={topicBubbles}
          title="Thematic Conversation Cluster Bubbles"
          subtitle="Click on any cluster to inspect its keyword matrix and message stream"
          onSelectTopic={(t) => setSelectedClusterId(t.id)}
          height={240}
        />
      )}

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
                  className={`p-5 rounded-2xl glass-card-3d cursor-pointer space-y-3 ${
                    isSelected ? 'border-cyan-400 shadow-xl ring-1 ring-cyan-400/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cluster.icon}</span>
                      <div>
                        <h3 className="font-bold text-xs text-white">{cluster.name}</h3>
                        <span className="text-[10px] text-theme-muted uppercase font-semibold">
                          {cluster.percentage}% of Archive
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-400/40">
                      {cluster.messageCount.toLocaleString()} msgs
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, cluster.percentage))}%` }}
                    />
                  </div>

                  {/* Keywords Preview */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cluster.topKeywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw.word}
                        className="px-2 py-0.5 rounded-md bg-black/40 border border-theme-border/60 text-[10px] text-theme-muted"
                      >
                        #{kw.word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Cluster Deep Dive Panel */}
          {selectedCluster && (
            <div className="glass-card-3d p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-theme-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCluster.icon}</span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {selectedCluster.name} Deep Intelligence
                    </h3>
                    <p className="text-xs text-theme-muted">
                      Category: {selectedCluster.category} • {selectedCluster.percentage}% total volume
                    </p>
                  </div>
                </div>

                <span className="text-xs text-cyan-400 font-bold">
                  {selectedCluster.messageCount.toLocaleString()} messages
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Keywords Cloud */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Top Keywords by Weight
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCluster.topKeywords.map((kw) => (
                      <div
                        key={kw.word}
                        className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center gap-1.5 text-xs font-mono"
                      >
                        <span className="text-cyan-300 font-bold">#{kw.word}</span>
                        <span className="text-[10px] text-theme-dim">({kw.weight}x)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Participants */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Active Participants
                  </span>
                  <div className="space-y-1.5">
                    {selectedCluster.topParticipants.map((p) => (
                      <div
                        key={p.actor}
                        className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-theme-border/60 text-xs font-mono"
                      >
                        <span className="text-white font-bold">{p.actor}</span>
                        <span className="text-cyan-400 font-bold">{p.count} messages</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Messages Carousel */}
              <div className="space-y-2 pt-2 border-t border-theme-border/50">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Sample Discussion Excerpts
                </span>
                <div className="space-y-2">
                  {selectedCluster.sampleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-xl bg-black/50 border border-theme-border/60 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{msg.actor || 'Participant'}:</span>
                        <span className="text-theme-text font-sans">&ldquo;{msg.content}&rdquo;</span>
                      </div>
                      <span className="text-[10px] text-theme-dim shrink-0">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Smart Conversation Threads */}
      {activeTab === 'THREADS' && (
        <div className="space-y-4">
          {threads.length === 0 ? (
            <div className="p-12 rounded-2xl glass-card-3d text-center text-xs text-theme-dim">
              No reconstructed discussion threads found.
            </div>
          ) : (
            threads.map((thread) => {
              const isExpanded = expandedThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  className="glass-card-3d p-5 rounded-2xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white font-mono">
                          {thread.topicTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/40">
                          {thread.messageCount} msgs
                        </span>
                        <span className="text-[10px] text-theme-muted font-mono flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {thread.durationMinutes} min session
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-theme-dim font-mono">
                        <span>Initiator: <strong className="text-cyan-400">{thread.initiator}</strong></span>
                        <span>•</span>
                        <span>{new Date(thread.startTime).toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      variant={isExpanded ? 'accent-outline' : 'secondary'}
                      size="xs"
                      onClick={() => setExpandedThreadId(isExpanded ? null : thread.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Read Thread'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pt-3 border-t border-theme-border/50 space-y-2">
                      <div className="text-[11px] text-theme-muted uppercase tracking-wider font-bold">
                        Participants: {thread.participants.join(', ')}
                      </div>
                      <div className="space-y-1.5">
                        {thread.sampleMessages.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 rounded-xl bg-black/60 border border-theme-border/60 text-xs font-mono flex items-start gap-2"
                          >
                            <span className="text-cyan-400 font-bold shrink-0">{m.actor || 'Actor'}:</span>
                            <span className="text-theme-text font-sans flex-1">{m.content}</span>
                            <span className="text-[10px] text-theme-dim shrink-0">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. Interactive Forensic Word Cloud Tab */}
      {activeTab === 'WORDCLOUD' && (
        <WordCloudView />
      )}
    </div>
  );
}
