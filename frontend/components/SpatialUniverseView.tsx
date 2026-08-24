'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpatialNode {
  id: string;
  x: number;
  y: number;
  z: number;
  actor: string;
  color: string;
  timestamp: string;
  content: string;
  charCount: number;
}

interface SpatialUniverseViewProps {
  datasetId: string;
  datasetName: string;
}

const ACTOR_PALETTE = [
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#34d399', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#818cf8', // Indigo
  '#2dd4bf', // Teal
  '#fb923c', // Orange
];

export function SpatialUniverseView({ datasetId, datasetName }: SpatialUniverseViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<SpatialNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SpatialNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SpatialNode | null>(null);
  const [isAutoOrbit, setIsAutoOrbit] = useState(true);
  const [nodeLimit, setNodeLimit] = useState(800);

  // Camera & Rotation State
  const cameraRef = useRef({
    rotX: 0.25,
    rotY: 0.4,
    distance: 1200,
    targetX: 0,
    targetY: 0,
  });

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Fetch timeline records for 3D coordinates
  useEffect(() => {
    let isCancelled = false;
    const fetchNodes = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/search/${datasetId}?limit=${nodeLimit}`);
        if (res.ok && !isCancelled) {
          const data = await res.json();
          const items: any[] = data.events || data.results || [];

          // Build actor color mapping
          const actorColorMap = new Map<string, string>();
          let colorIdx = 0;

          const n = items.length;
          const generatedNodes: SpatialNode[] = items.map((evt, idx) => {
            const actor = evt.actor || 'System';
            if (!actorColorMap.has(actor)) {
              actorColorMap.set(actor, ACTOR_PALETTE[colorIdx % ACTOR_PALETTE.length]);
              colorIdx++;
            }

            // 3D coordinates:
            // X: Chronological progression (-600 to +600)
            const x = (idx / Math.max(1, n) - 0.5) * 1200;

            // Y: Message length / activity height (-250 to +250)
            const len = (evt.content || '').length;
            const y = Math.max(-250, Math.min(250, (len - 80) * 1.5));

            // Z: Actor radial distribution around central galaxy core
            const actorHash = actor.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
            const angle = (actorHash % 360) * (Math.PI / 180) + (idx / n) * Math.PI * 2;
            const radius = 150 + (actorHash % 250);
            const z = Math.sin(angle) * radius;

            return {
              id: evt.id || `node_${idx}`,
              x,
              y,
              z,
              actor,
              color: actorColorMap.get(actor) || '#38bdf8',
              timestamp: evt.timestamp,
              content: evt.content || '',
              charCount: len,
            };
          });

          setNodes(generatedNodes);
        }
      } catch (err) {
        console.error('Failed to load 3D spatial nodes:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchNodes();
    return () => {
      isCancelled = true;
    };
  }, [datasetId, nodeLimit]);

  // Main 3D Canvas Projection & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Auto-orbit camera
      if (isAutoOrbit && !isDraggingRef.current) {
        cameraRef.current.rotY += 0.002;
      }

      const { rotX, rotY, distance } = cameraRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // Rotation matrix trigonometry
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // 1. Draw 3D Celestial Grid Ground Plane
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 800;
      const gridStep = 200;
      const gridY = 280;

      for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
        // Line along Z
        const p1 = project3D(gx, gridY, -gridSize, cosX, sinX, cosY, sinY, distance, cx, cy);
        const p2 = project3D(gx, gridY, gridSize, cosX, sinX, cosY, sinY, distance, cx, cy);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
      }

      for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
        // Line along X
        const p1 = project3D(-gridSize, gridY, gz, cosX, sinX, cosY, sinY, distance, cx, cy);
        const p2 = project3D(gridSize, gridY, gz, cosX, sinX, cosY, sinY, distance, cx, cy);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
      }

      // 2. Project Nodes to 2D screen with depth sorting
      interface ProjectedNode {
        node: SpatialNode;
        px: number;
        py: number;
        scale: number;
        depthZ: number;
      }

      const projected: ProjectedNode[] = [];

      for (const node of nodes) {
        const p = project3D(node.x, node.y, node.z, cosX, sinX, cosY, sinY, distance, cx, cy);
        if (p) {
          projected.push({
            node,
            px: p.px,
            py: p.py,
            scale: p.scale,
            depthZ: p.depthZ,
          });
        }
      }

      // Sort by depth (painters algorithm)
      projected.sort((a, b) => b.depthZ - a.depthZ);

      // 3. Draw Constellation Thread Edges (between adjacent messages)
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length - 1; i++) {
        const a = projected[i];
        const b = projected[i + 1];
        if (Math.abs(a.px - b.px) < 180 && Math.abs(a.py - b.py) < 180) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(0.2, (a.scale + b.scale) * 0.1)})`;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
      }

      // 4. Render Particle Spheres with Aura Glow
      for (const item of projected) {
        const isHovered = hoveredNode?.id === item.node.id;
        const isSelected = selectedNode?.id === item.node.id;

        const baseRadius = Math.max(2, Math.min(10, 4 * item.scale));
        const radius = isHovered || isSelected ? baseRadius * 2 : baseRadius;

        // Glow Aura
        if (isHovered || isSelected) {
          const grad = ctx.createRadialGradient(item.px, item.py, 0, item.px, item.py, radius * 3);
          grad.addColorStop(0, item.node.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(item.px, item.py, radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Particle Core
        ctx.fillStyle = isHovered ? '#ffffff' : item.node.color;
        ctx.beginPath();
        ctx.arc(item.px, item.py, radius, 0, Math.PI * 2);
        ctx.fill();

        // Optional actor label on large scale
        if (item.scale > 1.2 || isHovered || isSelected) {
          ctx.font = '10px monospace';
          ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.7)';
          ctx.fillText(item.node.actor, item.px + radius + 4, item.py + 3);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, isAutoOrbit, hoveredNode, selectedNode]);

  // Helper 3D Projection Calculation
  const project3D = (
    x: number,
    y: number,
    z: number,
    cosX: number,
    sinX: number,
    cosY: number,
    sinY: number,
    distance: number,
    cx: number,
    cy: number,
  ) => {
    // Rotate around Y-axis
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    // Rotate around X-axis
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Perspective transformation
    const depthZ = z2 + distance;
    if (depthZ <= 50) return null; // Behind camera

    const fov = 700;
    const scale = fov / depthZ;
    const px = cx + x1 * scale;
    const py = cy + y2 * scale;

    return { px, py, scale, depthZ };
  };

  // Mouse drag camera controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      cameraRef.current.rotY += dx * 0.005;
      cameraRef.current.rotX = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, cameraRef.current.rotX + dy * 0.005),
      );
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover detection
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * window.devicePixelRatio;
      const mouseY = (e.clientY - rect.top) * window.devicePixelRatio;

      const { rotX, rotY, distance } = cameraRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      let closest: SpatialNode | null = null;
      let minDistance = 25; // Pixel threshold

      for (const node of nodes) {
        const p = project3D(node.x, node.y, node.z, cosX, sinX, cosY, sinY, distance, cx, cy);
        if (p) {
          const d = Math.hypot(p.px - mouseX, p.py - mouseY);
          if (d < minDistance) {
            minDistance = d;
            closest = node;
          }
        }
      }

      setHoveredNode(closest);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraRef.current.distance = Math.max(
      400,
      Math.min(2500, cameraRef.current.distance + e.deltaY * 0.8),
    );
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    }
  };

  const resetCamera = () => {
    cameraRef.current = {
      rotX: 0.25,
      rotY: 0.4,
      distance: 1200,
      targetX: 0,
      targetY: 0,
    };
  };

  return (
    <div className="relative w-full h-[720px] rounded-3xl bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl font-mono text-slate-100 flex flex-col select-none">
      {/* 3D Viewport Header & HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Title Badge */}
        <div className="pointer-events-auto flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-black font-black text-sm shadow-md">
            🌌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100">3D Spatial Universe Explorer</h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                {nodes.length} PARTICLES
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[240px]">{datasetName}</p>
          </div>
        </div>

        {/* HUD Controls */}
        <div className="pointer-events-auto flex items-center gap-2 p-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg">
          <button
            onClick={() => setIsAutoOrbit((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              isAutoOrbit
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            {isAutoOrbit ? '⏸ ORBIT ACTIVE' : '▶ RESUME ORBIT'}
          </button>

          <button
            onClick={resetCamera}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            ↺ RESET VIEW
          </button>

          <select
            value={nodeLimit}
            onChange={(e) => setNodeLimit(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 outline-none cursor-pointer"
          >
            <option value={400}>400 Nodes</option>
            <option value={800}>800 Nodes</option>
            <option value={1500}>1,500 Nodes</option>
            <option value={3000}>3,000 Nodes</option>
          </select>
        </div>
      </div>

      {/* 3D Canvas Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-cyan-300 font-bold">Projecting 3D Spatial Universe...</span>
        </div>
      )}

      {/* Hover Node Tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-6 left-6 z-20 max-w-sm p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 shadow-2xl pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="text-xs font-bold text-white">{hoveredNode.actor}</span>
            <span className="text-[10px] text-slate-500">
              {new Date(hoveredNode.timestamp).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 italic">
            &ldquo;{hoveredNode.content}&rdquo;
          </p>
          <span className="text-[9px] text-cyan-400/80 block mt-1">CLICK TO INSPECT RECORD</span>
        </div>
      )}

      {/* Selected Node Forensic Inspector Card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-6 right-6 z-30 max-w-md w-full p-4 rounded-3xl bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/50 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <h3 className="text-xs font-bold text-white">{selectedNode.actor}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">TIMESTAMP</span>
                  <span className="text-slate-200 font-bold block mt-0.5">
                    {new Date(selectedNode.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">LENGTH</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">
                    {selectedNode.charCount} characters
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto">
                {selectedNode.content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 pointer-events-none hidden md:block">
        DRAG TO ROTATE 3D SPACE • SCROLL TO ZOOM CAMERA • CLICK NODE TO INSPECT
      </div>
    </div>
  );
}
