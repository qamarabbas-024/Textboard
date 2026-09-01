'use client';

import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';

export interface StoryboardEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorColor: string;
  category: 'MESSAGE' | 'FINANCIAL' | 'DOCUMENT' | 'ANOMALY';
  categoryIcon: string;
  title: string;
  snippet: string;
  emotionTag?: string;
  hash: string;
  batesNumber?: string;
}

const INITIAL_EVENTS: StoryboardEvent[] = [
  {
    id: 'ev-01',
    timestamp: '2026-08-24 09:14:02',
    actor: 'Marcus Vance',
    actorColor: '#00f0ff',
    category: 'MESSAGE',
    categoryIcon: '💬',
    title: 'Initial Deal Coordination',
    snippet: 'Confirming wire routing instructions for Exhibit 14-B escrow closure.',
    emotionTag: '💼 Business',
    hash: '8f92a1c0...41f2',
    batesNumber: 'TB-000101',
  },
  {
    id: 'ev-02',
    timestamp: '2026-08-24 11:30:15',
    actor: 'Elena Rostova',
    actorColor: '#a855f7',
    category: 'DOCUMENT',
    categoryIcon: '📑',
    title: 'Uploaded Redacted Schedule B',
    snippet: 'Quarterly financial disclosure with signed appendix uploaded.',
    emotionTag: '📄 Verified',
    hash: '3e710b99...a812',
    batesNumber: 'TB-000102',
  },
  {
    id: 'ev-03',
    timestamp: '2026-08-24 23:48:19',
    actor: 'System Auditing Daemon',
    actorColor: '#ef4444',
    category: 'ANOMALY',
    categoryIcon: '🚨',
    title: 'Midnight Velocity Spike Detected',
    snippet: '42 consecutive encrypted messages sent outside normal business hours.',
    emotionTag: '⚠️ Anomaly',
    hash: '9d41fe01...33cb',
    batesNumber: 'TB-000103',
  },
  {
    id: 'ev-04',
    timestamp: '2026-08-25 08:05:44',
    actor: 'Meridian Escrow Vault',
    actorColor: '#10b981',
    category: 'FINANCIAL',
    categoryIcon: '💰',
    title: 'Cleared International Wire Transfer',
    snippet: 'Wire amount $1,450,000.00 USD cleared through Federal Reserve gateway.',
    emotionTag: '💵 Cleared',
    hash: '7c89b41a...d901',
    batesNumber: 'TB-000104',
  },
  {
    id: 'ev-05',
    timestamp: '2026-08-25 10:12:30',
    actor: 'Marcus Vance',
    actorColor: '#00f0ff',
    category: 'MESSAGE',
    categoryIcon: '💬',
    title: 'Escrow Release Confirmation',
    snippet: 'Receipt acknowledged. Ready for final dossier submission to court.',
    emotionTag: '✅ Complete',
    hash: '5a12cd88...e940',
    batesNumber: 'TB-000105',
  },
];

export function TimelineStoryboardStudio() {
  const [events, setEvents] = useState<StoryboardEvent[]>(INITIAL_EVENTS);
  const [selectedActor, setSelectedActor] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<StoryboardEvent | null>(null);

  const actors = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.actor)));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchActor = selectedActor === 'ALL' || e.actor === selectedActor;
      const matchCat = selectedCategory === 'ALL' || e.category === selectedCategory;
      const matchSearch =
        !searchTerm ||
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.actor.toLowerCase().includes(searchTerm.toLowerCase());
      return matchActor && matchCat && matchSearch;
    });
  }, [events, selectedActor, selectedCategory, searchTerm]);

  return (
    <div className="glass-card-3d p-6 rounded-3xl border border-cyan-500/30 bg-[#070b16] shadow-2xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-lg shadow-md shadow-cyan-500/20">
            🎬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Multi-Actor Timeline Storyboard Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                CHRONO-FORENSIC
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Interactive multi-stream chronological storyboard with incident window filtering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-cyan-400 font-bold px-3 py-1 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            {filteredEvents.length} Events Visible
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3 rounded-2xl border border-white/[0.08] text-xs">
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search timeline events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-cyan-400 outline-none"
        />

        {/* Actor Filter */}
        <select
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          className="bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-cyan-300 focus:border-cyan-400 outline-none cursor-pointer"
        >
          <option value="ALL">👤 All Actors ({actors.length})</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-amber-300 focus:border-cyan-400 outline-none cursor-pointer"
        >
          <option value="ALL">🏷️ All Categories</option>
          <option value="MESSAGE">💬 Messages &amp; Chats</option>
          <option value="FINANCIAL">💰 Financial Transfers</option>
          <option value="DOCUMENT">📑 Documents &amp; Exhibits</option>
          <option value="ANOMALY">🚨 Security Anomalies</option>
        </select>
      </div>

      {/* Storyboard Swimlane Timeline View */}
      <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-purple-500 before:to-emerald-500">
        {filteredEvents.map((ev) => {
          const isSelected = selectedEvent?.id === ev.id;
          return (
            <div
              key={ev.id}
              onClick={() => setSelectedEvent(isSelected ? null : ev)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#04060c]/80 border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#070b16]'
              }`}
            >
              {/* Timeline Marker Dot */}
              <div
                className="absolute -left-6 sm:-left-10 top-5 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md"
                style={{ backgroundColor: ev.actorColor + '25', border: `2px solid ${ev.actorColor}` }}
              >
                {ev.categoryIcon}
              </div>

              {/* Event Content Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.05] pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-lg border"
                    style={{
                      color: ev.actorColor,
                      borderColor: ev.actorColor + '40',
                      backgroundColor: ev.actorColor + '10',
                    }}
                  >
                    {ev.actor}
                  </span>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {ev.title}
                  </h4>
                  {ev.emotionTag && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                      {ev.emotionTag}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                  <span>⏱️ {ev.timestamp}</span>
                  {ev.batesNumber && (
                    <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {ev.batesNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Snippet */}
              <p className="text-xs text-neutral-300 mt-2.5 font-sans leading-relaxed">
                {ev.snippet}
              </p>

              {/* Expanded Details Drawer */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-cyan-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-neutral-400 animate-fadeIn">
                  <div>
                    <span className="text-cyan-400 font-bold">SHA-256 DIGEST:</span>{' '}
                    <span className="text-neutral-300 font-mono">{ev.hash}</span>
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">EVENT ID:</span>{' '}
                    <span className="text-neutral-300">{ev.id}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
