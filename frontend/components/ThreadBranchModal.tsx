'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ThreadNode {
  id: string;
  actor: string | null;
  timestamp: string;
  content: string;
  depth: number;
  quotedActor?: string;
  quotedSnippet?: string;
  children: ThreadNode[];
}

interface ThreadBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootMessage?: {
    id: string;
    actor: string | null;
    content: string;
    timestamp: string;
  };
  onJumpToMessage?: (id: string) => void;
}

export function ThreadBranchModal({
  isOpen,
  onClose,
  rootMessage,
  onJumpToMessage,
}: ThreadBranchModalProps) {
  const [activeTab, setActiveTab] = useState<'tree' | 'linear'>('tree');

  if (!isOpen || !rootMessage) return null;

  // Sample branching response hierarchy
  const mockChildren: ThreadNode[] = [
    {
      id: `${rootMessage.id}_reply_1`,
      actor: 'Participant Alpha',
      timestamp: new Date(new Date(rootMessage.timestamp).getTime() + 180000).toISOString(),
      content: 'Understood. Reviewing the proposed timeline and updating the project milestones.',
      depth: 1,
      quotedActor: rootMessage.actor || 'User',
      quotedSnippet: rootMessage.content.slice(0, 40),
      children: [
        {
          id: `${rootMessage.id}_reply_1_sub`,
          actor: 'Lead Architect',
          timestamp: new Date(new Date(rootMessage.timestamp).getTime() + 420000).toISOString(),
          content: 'Confirmed. Database WAL checkpointing and index compaction ready for rollout.',
          depth: 2,
          quotedActor: 'Participant Alpha',
          quotedSnippet: 'Reviewing the proposed timeline',
          children: [],
        },
      ],
    },
    {
      id: `${rootMessage.id}_reply_2`,
      actor: 'Quality Assurance',
      timestamp: new Date(new Date(rootMessage.timestamp).getTime() + 600000).toISOString(),
      content: '100% automated regression tests passing across all 31 test suites.',
      depth: 1,
      children: [],
    },
  ];

  const renderNode = (node: ThreadNode) => {
    return (
      <div key={node.id} className="relative pl-6 pt-3 border-l-2 border-theme-border/60 ml-3">
        {/* Branch Dot */}
        <div className="absolute -left-[7px] top-4.5 w-3 h-3 rounded-full bg-theme-accent border-2 border-theme-surface shadow-xs" />

        <div className="p-3 rounded-2xl bg-theme-raised border border-theme-border space-y-1.5 text-xs hover:border-theme-accent/60 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-bold text-theme-accent">{node.actor || 'Participant'}</span>
            <span className="text-[10px] text-theme-dim">
              {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {node.quotedSnippet && (
            <div className="p-2 rounded-xl bg-theme-base/80 border-l-2 border-cyan-400 text-[10px] text-theme-dim italic">
              Quoting {node.quotedActor}: &ldquo;{node.quotedSnippet}&rdquo;
            </div>
          )}

          <p className="text-theme-text font-sans">{node.content}</p>

          <div className="flex items-center justify-end pt-1">
            <button
              onClick={() => {
                if (onJumpToMessage) onJumpToMessage(node.id);
                onClose();
              }}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              Jump to Message →
            </button>
          </div>
        </div>

        {node.children.map((child) => renderNode(child))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-theme-text">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-theme-raised flex items-center justify-center text-lg text-theme-accent border border-theme-border">
                🌿
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text">
                  Conversation Reply Hierarchy
                </h3>
                <p className="text-[10px] text-theme-dim">
                  Nested quote lineage &amp; reply branch tree
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-theme-dim hover:text-theme-text hover:bg-theme-raised cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Root Message Card */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">Root: {rootMessage.actor || 'User'}</span>
              <span className="text-[10px] text-cyan-400/80">
                {new Date(rootMessage.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-neutral-100 font-sans text-xs">{rootMessage.content}</p>
          </div>

          {/* Branch Tree View */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            <div className="text-[10px] uppercase font-bold text-theme-dim pl-1">
              Direct &amp; Cascading Responses ({mockChildren.length + 1} Branches)
            </div>
            {mockChildren.map((child) => renderNode(child))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end pt-3 border-t border-theme-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-theme-accent text-black font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
            >
              Close Hierarchy
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
