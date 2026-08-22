'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon, ActivityIcon, ClockIcon, SearchIcon } from './Icons';
import { AnimatedCounter } from './AnimatedCounter';

export interface GraphNode {
  id: string;
  label: string;
  messageCount: number;
  avgChars: number;
  color: string;
  x: number;
  y: number;
  radius: number;
}

export interface GraphLink {
  actorA: string;
  actorB: string;
  source?: string;
  target?: string;
  totalExchanges: number;
  aToBInitiations: number;
  bToAInitiations: number;
  avgResponseSecsAtoB: number;
  avgResponseSecsBtoA: number;
  balanceRatio: number;
}

interface RelationshipGraphViewProps {
  datasetId: string;
  datasets?: Array<{ id: string; name: string; totalEvents: number }>;
  relationships?: any[];
  people?: any[];
}

const ACTOR_COLORS = [
  '#00f0ff', // Cyan
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

export function RelationshipGraphView({
  datasetId,
  datasets = [],
  relationships: initialRelationships = [],
  people: initialPeople = [],
}: RelationshipGraphViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasetId);
  const [relationships, setRelationships] = useState<GraphLink[]>(initialRelationships);
  const [people, setPeople] = useState<any[]>(initialPeople);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [minExchanges, setMinExchanges] = useState<number>(1);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [graphDimensions, setGraphDimensions] = useState({ width: 750, height: 480 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch relationship & people data if changed or not provided
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/analytics/${selectedDatasetId}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setRelationships(data.relationships || []);
            setPeople(data.messageAnalytics?.byPerson || []);
          }
        }
      } catch (err) {
        console.error('Failed to load relationship graph data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [selectedDatasetId]);

  // Adjust SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 200) {
          setGraphDimensions({ width: w, height: Math.max(420, Math.min(540, w * 0.55)) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Nodes
  const nodes = useMemo<GraphNode[]>(() => {
    const list = people.filter((p) =>
      filterSearch ? p.actor.toLowerCase().includes(filterSearch.toLowerCase()) : true,
    );

    if (list.length === 0) return [];

    const maxMsgs = Math.max(1, ...list.map((p) => p.messageCount || 1));
    const cx = graphDimensions.width / 2;
    const cy = graphDimensions.height / 2;
    const radiusOrbit = Math.min(graphDimensions.width, graphDimensions.height) * 0.36;

    return list.map((p, idx) => {
      const angle = (idx / list.length) * 2 * Math.PI - Math.PI / 2;
      const r = Math.max(18, Math.min(42, 18 + ((p.messageCount || 1) / maxMsgs) * 24));
      return {
        id: p.actor,
        label: p.actor,
        messageCount: p.messageCount,
        avgChars: p.avgChars || 0,
        color: ACTOR_COLORS[idx % ACTOR_COLORS.length],
        x: cx + radiusOrbit * Math.cos(angle),
        y: cy + radiusOrbit * Math.sin(angle),
        radius: r,
      };
    });
  }, [people, filterSearch, graphDimensions]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return relationships.filter((r) => {
      if (r.totalExchanges < minExchanges) return false;
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        return r.actorA.toLowerCase().includes(query) || r.actorB.toLowerCase().includes(query);
      }
      return true;
    });
  }, [relationships, minExchanges, filterSearch]);

  const maxExchanges = useMemo(() => {
    return Math.max(1, ...filteredLinks.map((l) => l.totalExchanges));
  }, [filteredLinks]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  return (
    <div className="space-y-6 font-mono animate-fadeIn">
      {/* 1. Header & Multi-Actor Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.08] bg-[#10141d]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <UsersIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100">
                MULTI-ACTOR RELATIONSHIP GRAPH
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] text-purple-300 font-semibold">
                V1.4
              </span>
            </div>
            <span className="text-[11px] text-neutral-500">
              Interactive topological network of conversational initiations, exchange volumes &amp; reply latencies
            </span>
          </div>
        </div>

        {/* Multi-Dataset / Cross-Conversation Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {datasets.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-500">Dataset:</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="bg-[#151b26] border border-white/[0.12] rounded px-2.5 py-1 text-xs text-neutral-200 font-semibold focus:outline-none focus:border-cyan-500/50"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.totalEvents.toLocaleString()} msgs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Min Exchange Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] px-2.5 py-1 rounded-lg text-xs">
            <span className="text-neutral-400 text-[11px]">Min Exchanges:</span>
            <input
              type="range"
              min={1}
              max={Math.max(5, maxExchanges)}
              value={minExchanges}
              onChange={(e) => setMinExchanges(Number(e.target.value))}
              className="w-20 accent-cyan-400 bg-white/[0.1] h-1 rounded"
            />
            <span className="text-cyan-300 font-bold text-[11px]">{minExchanges}</span>
          </div>

          {/* Actor Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search actor..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded px-2.5 py-1 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/40 w-32"
            />
            {filterSearch && (
              <button
                onClick={() => setFilterSearch('')}
                className="absolute right-2 top-1.5 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Network Graph & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#0c1018]/90 p-4 relative overflow-hidden shadow-2xl flex flex-col justify-center items-center min-h-[460px]"
        >
          {loading ? (
            <div className="flex items-center justify-center p-12 text-neutral-400 gap-2 text-xs">
              <span className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering multi-actor topology...</span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-xs text-neutral-500 p-8 text-center">
              No participants found matching current filter threshold.
            </div>
          ) : (
            <div className="relative w-full flex justify-center">
              <svg
                width={graphDimensions.width}
                height={graphDimensions.height}
                viewBox={`0 0 ${graphDimensions.width} ${graphDimensions.height}`}
                className="select-none max-w-full"
              >
                <defs>
                  {/* Neon Glow Filters */}
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="link-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Network Edges / Links */}
                {filteredLinks.map((link, idx) => {
                  const nodeA = nodeMap.get(link.actorA);
                  const nodeB = nodeMap.get(link.actorB);
                  if (!nodeA || !nodeB) return null;

                  const isLinkSelected =
                    selectedLink &&
                    selectedLink.actorA === link.actorA &&
                    selectedLink.actorB === link.actorB;
                  const isNodeRelated =
                    selectedNode &&
                    (selectedNode.id === link.actorA || selectedNode.id === link.actorB);

                  const strokeWidth = Math.max(
                    1.5,
                    Math.min(8, 1.5 + (link.totalExchanges / maxExchanges) * 6.5),
                  );

                  return (
                    <g key={`edge-${link.actorA}-${link.actorB}-${idx}`}>
                      <line
                        x1={nodeA.x}
                        y1={nodeA.y}
                        x2={nodeB.x}
                        y2={nodeB.y}
                        stroke={
                          isLinkSelected || isNodeRelated
                            ? '#22d3ee'
                            : 'rgba(255, 255, 255, 0.12)'
                        }
                        strokeWidth={strokeWidth}
                        strokeDasharray={link.aToBInitiations > link.bToAInitiations ? 'none' : '4,3'}
                        className="cursor-pointer transition-all duration-200 hover:stroke-cyan-400"
                        onClick={() => {
                          setSelectedLink(link);
                          setSelectedNode(null);
                        }}
                      />
                      {/* Midpoint exchange label */}
                      {strokeWidth > 3 && (
                        <circle
                          cx={(nodeA.x + nodeB.x) / 2}
                          cy={(nodeA.y + nodeB.y) / 2}
                          r={7}
                          fill="#10141d"
                          stroke="#22d3ee"
                          strokeWidth="1.5"
                          className="cursor-pointer"
                          onClick={() => setSelectedLink(link)}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Network Participant Nodes */}
                {nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isRelatedToSelectedLink =
                    selectedLink &&
                    (selectedLink.actorA === node.id || selectedLink.actorB === node.id);

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-transform duration-200"
                      onClick={() => {
                        setSelectedNode(node);
                        setSelectedLink(null);
                      }}
                    >
                      {/* Outer Ring Pulse */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius + 6}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="2"
                          strokeDasharray="4,4"
                          className="animate-spin origin-center"
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill="#10141d"
                        stroke={isSelected || isRelatedToSelectedLink ? '#ffffff' : node.color}
                        strokeWidth={isSelected ? 3 : 2}
                        filter={isSelected ? 'url(#glow-cyan)' : undefined}
                      />

                      {/* Initial Avatar Letter */}
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fill={node.color}
                        fontSize={Math.max(10, node.radius * 0.65)}
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {node.label.charAt(0).toUpperCase()}
                      </text>

                      {/* Node Label Below */}
                      <text
                        x={node.x}
                        y={node.y + node.radius + 14}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="11"
                        fontWeight="600"
                        className="pointer-events-none"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + node.radius + 25}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        className="pointer-events-none"
                      >
                        {node.messageCount.toLocaleString()} msgs
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend Overlay */}
              <div className="absolute bottom-2 left-2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Node Radius: Volume
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-cyan-400" /> Edge Thickness: Exchanges
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Dynamic Actor / Link Inspection Drawer */}
        <div className="lg:col-span-4 rounded-xl border border-white/[0.08] bg-[#10141d]/80 p-5 space-y-4 shadow-xl">
          {selectedLink ? (
            /* Selected Pair Interaction Dynamics */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  PAIRWISE INTERACTION DYNAMICS
                </span>
                <button
                  onClick={() => setSelectedLink(null)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                <div className="text-xs font-bold text-cyan-300">{selectedLink.actorA}</div>
                <div className="text-[11px] text-neutral-500">⟷</div>
                <div className="text-xs font-bold text-purple-300">{selectedLink.actorB}</div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-[10px] text-neutral-500 uppercase block">Total Exchanges</span>
                <span className="text-xl font-bold text-neutral-100">
                  <AnimatedCounter value={selectedLink.totalExchanges} />
                </span>
              </div>

              {/* Balance Ratio Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{selectedLink.actorA} ({Math.round(selectedLink.balanceRatio * 100)}%)</span>
                  <span>{selectedLink.actorB} ({100 - Math.round(selectedLink.balanceRatio * 100)}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.round(selectedLink.balanceRatio * 100)}%` }}
                  />
                  <div
                    className="h-full bg-purple-400"
                    style={{ width: `${100 - Math.round(selectedLink.balanceRatio * 100)}%` }}
                  />
                </div>
              </div>

              {/* Initiation & Latency Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded bg-black/30 border border-white/[0.04] space-y-1">
                  <span className="text-neutral-500 block truncate">{selectedLink.actorA} Initiated</span>
                  <strong className="text-cyan-300 text-sm">{selectedLink.aToBInitiations} times</strong>
                  <span className="text-[10px] text-neutral-500 block">
                    Avg Reply: {selectedLink.avgResponseSecsAtoB > 0 ? formatDuration(selectedLink.avgResponseSecsAtoB) : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-black/30 border border-white/[0.04] space-y-1">
                  <span className="text-neutral-500 block truncate">{selectedLink.actorB} Initiated</span>
                  <strong className="text-purple-300 text-sm">{selectedLink.bToAInitiations} times</strong>
                  <span className="text-[10px] text-neutral-500 block">
                    Avg Reply: {selectedLink.avgResponseSecsBtoA > 0 ? formatDuration(selectedLink.avgResponseSecsBtoA) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            /* Selected Single Actor Forensics */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  PARTICIPANT PROFILE
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${selectedNode.color}20`, color: selectedNode.color }}
                >
                  {selectedNode.label.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">{selectedNode.label}</h4>
                  <span className="text-[11px] text-neutral-400">
                    {selectedNode.messageCount.toLocaleString()} total messages
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[10px] text-neutral-500 uppercase block">Avg Message Length</span>
                  <strong className="text-neutral-200 text-sm">{selectedNode.avgChars} chars</strong>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[10px] text-neutral-500 uppercase block">Active Pairs</span>
                  <strong className="text-cyan-300 text-sm">
                    {relationships.filter((r) => r.actorA === selectedNode.id || r.actorB === selectedNode.id).length} links
                  </strong>
                </div>
              </div>

              {/* Direct Relationships */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Top Conversation Partners
                </span>
                {relationships
                  .filter((r) => r.actorA === selectedNode.id || r.actorB === selectedNode.id)
                  .sort((a, b) => b.totalExchanges - a.totalExchanges)
                  .slice(0, 4)
                  .map((r, i) => {
                    const partner = r.actorA === selectedNode.id ? r.actorB : r.actorA;
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedLink(r)}
                        className="flex items-center justify-between p-2 rounded bg-black/30 hover:bg-white/[0.05] border border-white/[0.04] cursor-pointer text-xs transition-colors"
                      >
                        <span className="text-neutral-200 font-medium">{partner}</span>
                        <span className="text-cyan-400 font-bold">{r.totalExchanges} msgs</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* Idle Inspection Helper */
            <div className="py-16 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-neutral-400">
                <UsersIcon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-neutral-300">INTERACTIVE GRAPH INSPECTION</h4>
              <p className="text-[11px] text-neutral-500 max-w-[220px] mx-auto">
                Click any participant node or connection line to inspect pairwise initiations, reply latency, and engagement balance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
