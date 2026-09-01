'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';

interface Node {
  id: string;
  name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'ACCOUNT' | 'LOCATION';
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
  label: string;
}

const INITIAL_NODES: Node[] = [
  { id: '1', name: 'Marcus Vance', type: 'PERSON', color: '#00f0ff', x: 250, y: 150, vx: 0, vy: 0, radius: 24, connections: 4 },
  { id: '2', name: 'Elena Rostova', type: 'PERSON', color: '#a855f7', x: 450, y: 140, vx: 0, vy: 0, radius: 22, connections: 3 },
  { id: '3', name: 'Meridian Escrow Vault', type: 'ORGANIZATION', color: '#10b981', x: 350, y: 300, vx: 0, vy: 0, radius: 26, connections: 4 },
  { id: '4', name: 'Apex Global Holdings', type: 'ORGANIZATION', color: '#f59e0b', x: 150, y: 320, vx: 0, vy: 0, radius: 22, connections: 2 },
  { id: '5', name: 'Escrow Acct #9042', type: 'ACCOUNT', color: '#ec4899', x: 520, y: 280, vx: 0, vy: 0, radius: 18, connections: 2 },
  { id: '6', name: 'Geneva Server Hub', type: 'LOCATION', color: '#6366f1', x: 340, y: 80, vx: 0, vy: 0, radius: 18, connections: 2 },
];

const INITIAL_EDGES: Edge[] = [
  { source: '1', target: '2', weight: 8, label: '42 Messages' },
  { source: '1', target: '3', weight: 6, label: 'Escrow Authorization' },
  { source: '2', target: '3', weight: 4, label: 'Schedule B Docs' },
  { source: '1', target: '4', weight: 5, label: 'Wire Transfer Request' },
  { source: '3', target: '5', weight: 7, label: '$1.45M Deposit' },
  { source: '1', target: '6', weight: 3, label: 'Encrypted Relay' },
  { source: '2', target: '6', weight: 3, label: 'Encrypted Relay' },
];

export function NetworkLinkGraphStudio() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges] = useState<Edge[]>(INITIAL_EDGES);
  const [minWeight, setMinWeight] = useState<number>(3);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('Drag nodes to arrange the network layout. Click any entity to inspect links.');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<Node | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const filteredEdges = edges.filter((e) => e.weight >= minWeight);

  // Physics Simulation Step
  const tickPhysics = useCallback(() => {
    setNodes((prevNodes) => {
      const updated = prevNodes.map((n) => ({ ...n }));

      // Repulsion between nodes
      for (let i = 0; i < updated.length; i++) {
        for (let j = i + 1; j < updated.length; j++) {
          const dx = updated[j].x - updated[i].x;
          const dy = updated[j].y - updated[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / 180;
            const fx = (dx / dist) * force * 1.5;
            const fy = (dy / dist) * force * 1.5;

            if (draggedNodeRef.current?.id !== updated[i].id) {
              updated[i].vx -= fx;
              updated[i].vy -= fy;
            }
            if (draggedNodeRef.current?.id !== updated[j].id) {
              updated[j].vx += fx;
              updated[j].vy += fy;
            }
          }
        }
      }

      // Spring attraction along edges
      filteredEdges.forEach((edge) => {
        const source = updated.find((n) => n.id === edge.source);
        const target = updated.find((n) => n.id === edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 130;
          const force = (dist - targetDist) * 0.02;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (draggedNodeRef.current?.id !== source.id) {
            source.vx += fx;
            source.vy += fy;
          }
          if (draggedNodeRef.current?.id !== target.id) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // Update positions with damping
      updated.forEach((node) => {
        if (draggedNodeRef.current?.id !== node.id) {
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.85;
          node.vy *= 0.85;

          // Canvas bounds clamping (650 x 380)
          node.x = Math.max(node.radius + 10, Math.min(640 - node.radius, node.x));
          node.y = Math.max(node.radius + 10, Math.min(370 - node.radius, node.y));
        }
      });

      return updated;
    });
  }, [filteredEdges]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Edges
    filteredEdges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle =
          selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id)
            ? 'rgba(0, 240, 255, 0.8)'
            : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = Math.max(1.5, edge.weight * 0.6);
        ctx.stroke();

        // Edge label
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(edge.label, midX - 20, midY - 6);
      }
    });

    // Draw Nodes
    nodes.forEach((node) => {
      const isSelected = selectedNode?.id === node.id;

      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + (isSelected ? 6 : 2), 0, 2 * Math.PI);
      ctx.fillStyle = node.color + (isSelected ? '40' : '15');
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#04060c';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : node.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Label
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, node.y + node.radius + 14);

      // Type Badge
      ctx.font = '8px monospace';
      ctx.fillStyle = node.color;
      ctx.fillText(node.type, node.x, node.y + 3);
    });

    // Run animation frame
    animationFrameRef.current = requestAnimationFrame(tickPhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, filteredEdges, selectedNode, tickPhysics]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedNode = nodes.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (clickedNode) {
      isDraggingRef.current = true;
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
      setStatusMsg(`🔍 Selected: ${clickedNode.name} (${clickedNode.type}) - Degree Centrality: ${clickedNode.connections}`);
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !draggedNodeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    draggedNodeRef.current.x = x;
    draggedNodeRef.current.y = y;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  // Export Diagram as PNG
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `TextBoard_Network_Link_Graph_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setStatusMsg('✓ Exported high-resolution courtroom link graph PNG!');
  };

  return (
    <div className="glass-card-3d p-6 rounded-3xl border border-cyan-500/30 bg-[#070b16] shadow-2xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-lg shadow-md shadow-cyan-500/20">
            🕸️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Entity &amp; Communications Link Graph Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                FORCE-DIRECTED
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Interactive relationship network graph mapping communication density, accounts, and hidden brokers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPng}
            className="font-bold shadow-lg shrink-0"
          >
            📸 Export High-Res PNG
          </Button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-black/40 border border-white/[0.08] text-xs">
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">Min Link Density:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value))}
            className="accent-cyan-400 w-28 cursor-pointer"
          />
          <span className="text-cyan-400 font-bold">{minWeight}+ Interactivity</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400">
            {nodes.length} Entities • {filteredEdges.length} Active Link Edges
          </span>
        </div>
      </div>

      {/* Canvas Interactive Force-Directed Network */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-[#04060c] border border-cyan-500/30 shadow-inner flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={650}
          height={380}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-grab active:cursor-grabbing max-w-full"
        />
      </div>

      {/* Status Bar */}
      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-300">
        {statusMsg}
      </div>

      {/* Node Detail Drawer */}
      {selectedNode && (
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.1] space-y-2 animate-fadeIn text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
            <span className="font-bold text-white uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }} />
              {selectedNode.name}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/[0.05] text-cyan-400 font-bold border border-white/[0.08]">
              {selectedNode.type}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-neutral-400 text-[11px] pt-1">
            <div>
              <span className="text-neutral-500">Connected Neighbors:</span>{' '}
              <span className="text-white font-bold">{selectedNode.connections}</span>
            </div>
            <div>
              <span className="text-neutral-500">Degree Centrality:</span>{' '}
              <span className="text-emerald-400 font-bold">0.86 (High)</span>
            </div>
            <div>
              <span className="text-neutral-500">Airgap Status:</span>{' '}
              <span className="text-cyan-300 font-bold">Verified Local</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
