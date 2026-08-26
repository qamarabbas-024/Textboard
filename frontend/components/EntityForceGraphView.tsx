'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'actor' | 'topic' | 'entity' | 'keyword';
  color: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

interface EntityForceGraphViewProps {
  datasetName?: string;
}

export function EntityForceGraphView({ datasetName = 'Communication Archive' }: EntityForceGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [nodeCount, setNodeCount] = useState(30);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Initialize deterministic node & link physics mesh
  useEffect(() => {
    const initialNodes: GraphNode[] = [
      { id: 'actor_1', label: 'Primary User', type: 'actor', color: '#38bdf8', radius: 18, x: 250, y: 200, vx: 0, vy: 0 },
      { id: 'actor_2', label: 'Participant A', type: 'actor', color: '#34d399', radius: 16, x: 450, y: 220, vx: 0, vy: 0 },
      { id: 'actor_3', label: 'Participant B', type: 'actor', color: '#a855f7', radius: 14, x: 350, y: 360, vx: 0, vy: 0 },
      { id: 'ent_finance', label: 'Invoices & Payments', type: 'topic', color: '#f59e0b', radius: 12, x: 200, y: 100, vx: 0, vy: 0 },
      { id: 'ent_tech', label: 'Architecture & Code', type: 'topic', color: '#06b6d4', radius: 13, x: 500, y: 120, vx: 0, vy: 0 },
      { id: 'ent_meet', label: 'Sync & Call', type: 'topic', color: '#ec4899', radius: 11, x: 300, y: 260, vx: 0, vy: 0 },
      { id: 'kw_contract', label: 'Contract', type: 'keyword', color: '#cbd5e1', radius: 8, x: 150, y: 180, vx: 0, vy: 0 },
      { id: 'kw_deadline', label: 'Deadline', type: 'keyword', color: '#cbd5e1', radius: 8, x: 420, y: 300, vx: 0, vy: 0 },
      { id: 'kw_server', label: 'Production Server', type: 'keyword', color: '#cbd5e1', radius: 8, x: 560, y: 200, vx: 0, vy: 0 },
    ];

    const initialLinks: GraphLink[] = [
      { source: 'actor_1', target: 'actor_2', weight: 4 },
      { source: 'actor_1', target: 'actor_3', weight: 3 },
      { source: 'actor_2', target: 'actor_3', weight: 2 },
      { source: 'actor_1', target: 'ent_finance', weight: 5 },
      { source: 'actor_2', target: 'ent_tech', weight: 4 },
      { source: 'actor_1', target: 'ent_meet', weight: 3 },
      { source: 'actor_2', target: 'ent_meet', weight: 3 },
      { source: 'ent_finance', target: 'kw_contract', weight: 3 },
      { source: 'ent_tech', target: 'kw_server', weight: 4 },
      { source: 'actor_3', target: 'kw_deadline', weight: 2 },
    ];

    nodesRef.current = initialNodes;
    linksRef.current = initialLinks;
  }, []);

  // Force simulation render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const stepSimulation = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Node Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 260) {
            const force = (260 - dist) / dist * 0.04;
            a.vx -= dx * force;
            a.vy -= dy * force;
            b.vx += dx * force;
            b.vy += dy * force;
          }
        }
      }

      // 2. Link Spring Attraction
      for (const link of links) {
        const a = nodes.find((n) => n.id === link.source);
        const b = nodes.find((n) => n.id === link.target);
        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desired = 140;
          const force = (dist - desired) * 0.003 * link.weight;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }

      // 3. Center gravity & velocity friction
      const cx = (canvas.width / window.devicePixelRatio) / 2;
      const cy = (canvas.height / window.devicePixelRatio) / 2;

      for (const n of nodes) {
        if (n !== draggedNodeRef.current) {
          n.vx += (cx - n.x) * 0.001;
          n.vy += (cy - n.y) * 0.001;
          n.vx *= 0.88;
          n.vy *= 0.88;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // 4. Render Canvas Frame
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Links
      for (const link of links) {
        const a = nodes.find((n) => n.id === link.source);
        const b = nodes.find((n) => n.id === link.target);
        if (a && b) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.1 + link.weight * 0.08})`;
          ctx.lineWidth = Math.max(1, link.weight * 0.8);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw Nodes
      for (const node of nodes) {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        // Halo glow
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `${node.color}33`;
          ctx.fill();
        }

        // Core Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label Text
        ctx.font = '10px monospace';
        ctx.fillStyle = isHovered ? '#ffffff' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      }

      ctx.restore();
      animId = requestAnimationFrame(stepSimulation);
    };

    stepSimulation();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [hoveredNode, selectedNode]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodesRef.current) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d <= node.radius + 4) {
        draggedNodeRef.current = node;
        setSelectedNode(node);
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else {
      let found: GraphNode | null = null;
      for (const node of nodesRef.current) {
        const d = Math.hypot(node.x - x, node.y - y);
        if (d <= node.radius + 4) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
    }
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
  };

  return (
    <div
      role="region"
      aria-label="Force-directed entity relationship graph"
      className="relative w-full h-[580px] rounded-3xl bg-theme-surface border border-theme-border overflow-hidden shadow-2xl flex flex-col font-mono text-theme-text select-none"
    >
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 p-3 rounded-2xl bg-theme-base/80 backdrop-blur-md border border-theme-border shadow-lg">
        <div className="w-8 h-8 rounded-xl bg-theme-raised flex items-center justify-center text-sm font-bold text-theme-accent">
          🕸️
        </div>
        <div>
          <h3 className="text-xs font-bold text-theme-text">Entity Co-occurrence Force Graph</h3>
          <p className="text-[10px] text-theme-dim">{datasetName}</p>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-10 p-3.5 rounded-2xl bg-theme-base/90 backdrop-blur-md border border-theme-border shadow-xl max-w-xs text-xs space-y-1 animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-theme-border">
            <strong className="text-theme-accent">{selectedNode.label}</strong>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-theme-dim hover:text-theme-text text-[10px]"
            >
              ✕
            </button>
          </div>
          <div className="text-[10px] text-theme-dim">
            TYPE: <span className="text-theme-text uppercase font-bold">{selectedNode.type}</span>
          </div>
          <p className="text-[10px] text-theme-dim">
            Drag node to rearrange force springs • Click outside to deselect
          </p>
        </div>
      )}
    </div>
  );
}
