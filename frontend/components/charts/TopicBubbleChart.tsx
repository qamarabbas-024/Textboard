'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TopicBubble {
  id: string;
  category: string;
  label: string;
  count: number;
  keywords: string[];
  color?: string;
}

interface TopicBubbleChartProps {
  topics: TopicBubble[];
  title?: string;
  subtitle?: string;
  height?: number;
  onSelectTopic?: (topic: TopicBubble) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Financial: '#10b981', // Emerald
  Technical: '#00f0ff', // Cyan
  Scheduling: '#f59e0b', // Amber
  Travel: '#ec4899', // Pink
  Operations: '#8b5cf6', // Violet
  Social: '#38bdf8', // Sky
};

export default function TopicBubbleChart({
  topics,
  title = 'Thematic Conversation Clusters & Bubble Matrix',
  subtitle = 'Contextual discussion topics weighted by keyword density',
  height = 260,
  onSelectTopic,
}: TopicBubbleChartProps) {
  const [hoveredTopic, setHoveredTopic] = useState<TopicBubble | null>(null);

  const width = 720;
  const maxCount = Math.max(...topics.map((t) => t.count), 1);

  // Position bubbles in a dynamic balanced cloud
  const bubbles = topics.slice(0, 12).map((topic, i) => {
    const radius = Math.max(26, Math.min(54, (topic.count / maxCount) * 54 + 20));
    const angle = (i / topics.length) * Math.PI * 2;
    const spreadX = 220;
    const spreadY = 70;
    const x = width / 2 + Math.cos(angle) * (spreadX + (i % 2 === 0 ? 30 : -20));
    const y = height / 2 + Math.sin(angle) * (spreadY + (i % 2 === 0 ? 15 : -15));
    const color = topic.color || CATEGORY_COLORS[topic.category] || '#00f0ff';

    return {
      ...topic,
      x,
      y,
      radius,
      color,
    };
  });

  return (
    <div className="glass-card-3d p-6 rounded-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text font-mono">
              {title}
            </h3>
          </div>
          <p className="text-xs text-theme-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* SVG Bubble Cloud */}
      <div className="relative w-full overflow-hidden flex items-center justify-center my-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <filter id="bubbleGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Ambient Field */}
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={width * 0.42}
            ry={height * 0.42}
            fill="rgba(0, 240, 255, 0.02)"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeDasharray="4 6"
          />

          {/* Bubbles */}
          {bubbles.map((b) => {
            const isHovered = hoveredTopic?.id === b.id;
            return (
              <g
                key={b.id}
                className="cursor-pointer transition-all duration-300"
                onClick={() => onSelectTopic?.(b)}
                onMouseEnter={() => setHoveredTopic(b)}
                onMouseLeave={() => setHoveredTopic(null)}
              >
                {/* Outer Glow Halo on Hover */}
                {isHovered && (
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.radius + 8}
                    fill="none"
                    stroke={b.color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    className="animate-spin-slow"
                  />
                )}

                {/* Main Bubble */}
                <motion.circle
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.85 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  cx={b.x}
                  cy={b.y}
                  r={isHovered ? b.radius + 4 : b.radius}
                  fill={b.color}
                  fillOpacity={isHovered ? 0.35 : 0.18}
                  stroke={b.color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  filter={isHovered ? 'url(#bubbleGlow)' : undefined}
                />

                {/* Inner Text Label */}
                <text
                  x={b.x}
                  y={b.y - 2}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-white font-mono pointer-events-none select-none"
                >
                  {b.label.slice(0, 10)}
                </text>
                <text
                  x={b.x}
                  y={b.y + 11}
                  textAnchor="middle"
                  className="text-[9px] fill-theme-muted font-mono pointer-events-none select-none"
                >
                  {b.count} msgs
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hovered Keyword Inspector Card */}
        <AnimatePresence>
          {hoveredTopic && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-6 right-6 bg-black/90 p-3 rounded-xl border border-cyan-400/40 backdrop-blur-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase"
                  style={{
                    backgroundColor: `${
                      CATEGORY_COLORS[hoveredTopic.category] || '#00f0ff'
                    }33`,
                    color: CATEGORY_COLORS[hoveredTopic.category] || '#00f0ff',
                    border: `1px solid ${
                      CATEGORY_COLORS[hoveredTopic.category] || '#00f0ff'
                    }66`,
                  }}
                >
                  {hoveredTopic.category}
                </span>
                <span className="font-bold text-white font-mono text-xs">{hoveredTopic.label}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hoveredTopic.keywords.slice(0, 4).map((kw, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-theme-surface text-[10px] font-mono text-theme-muted"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-cyan-300 font-mono font-bold text-xs">
                {hoveredTopic.count.toLocaleString()} messages
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
