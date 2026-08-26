'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AssistantCitation {
  id: string;
  timestamp: string;
  actor: string | null;
  snippet: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  keyStats?: Array<{ label: string; value: string; color?: string }>;
  citations?: AssistantCitation[];
  suggestedFollowUps?: string[];
  timestamp: Date;
}

interface LocalAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
  onJumpToMessage?: (messageId: string) => void;
}

const DEFAULT_SUGGESTIONS = [
  'Who sent the most messages in this chat?',
  'When is our peak time of day to chat?',
  'Detect activity spikes and anomalies',
  'What are the main conversation topics?',
  'Show top emojis used by the team',
  'What was our longest continuous streak?',
];

export function LocalAssistantDrawer({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: LocalAssistantDrawerProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      content: `Hello! I am your **Local Autonomous Intelligence Assistant** for **${datasetName}**.\n\nAll queries execute 100% on-device against your local SQLite database without any external cloud APIs. Ask me anything about participant activity, peak schedules, topics, anomalies, or search keywords!`,
      timestamp: new Date(),
      suggestedFollowUps: DEFAULT_SUGGESTIONS.slice(0, 3),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isQuerying]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || isQuerying) return;

    const userMsg: AssistantMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: queryText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsQuerying(true);

    try {
      const res = await fetch(`/api/v1/analytics/${datasetId}/assistant/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: AssistantMessage = {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          content: data.answer || 'Query processed.',
          intent: data.intent,
          keyStats: data.keyStats || [],
          citations: data.citations || [],
          suggestedFollowUps: data.suggestedFollowUps || DEFAULT_SUGGESTIONS.slice(0, 3),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'assistant',
            content: 'Could not process query. Please check dataset connection.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: 'Error communicating with local intelligence engine.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-lg h-full bg-slate-950/95 border-l border-cyan-500/30 shadow-2xl backdrop-blur-2xl font-mono text-slate-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-sm shadow-md">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-100">Local AI Intelligence</h2>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                    100% OFFLINE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                  {datasetName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Chat Stream History */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-cyan-600/30 border border-cyan-400/50 text-cyan-100'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 shadow-md'
                    }`}
                  >
                    {/* Intent Tag */}
                    {msg.intent && (
                      <div className="mb-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/40">
                          {msg.intent}
                        </span>
                      </div>
                    )}

                    {/* Key Stats Chips */}
                    {msg.keyStats && msg.keyStats.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {msg.keyStats.map((stat, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800"
                          >
                            <span className="text-[9px] text-slate-500 block uppercase truncate">
                              {stat.label}
                            </span>
                            <span
                              className="text-xs font-bold block truncate mt-0.5"
                              style={{ color: stat.color || '#38bdf8' }}
                            >
                              {stat.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Markdown Content */}
                    <div className="whitespace-pre-wrap font-sans text-xs text-slate-200">
                      {msg.content}
                    </div>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          CITED MESSAGE RECORDS:
                        </span>
                        {msg.citations.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400"
                          >
                            <div className="flex items-center justify-between text-cyan-400 mb-0.5">
                              <span>{c.actor || 'System'}</span>
                              <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-300 truncate">&ldquo;{c.snippet}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Follow-up suggestions */}
                  {!isUser && msg.suggestedFollowUps && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                      {msg.suggestedFollowUps.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAsk(suggestion)}
                          className="px-2.5 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-[10px] text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-left truncate max-w-full"
                        >
                          ✦ {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isQuerying && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-cyan-400 animate-pulse">
                <span className="animate-spin">⚙️</span>
                <span>Synthesizing local intelligence query...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about activity, top participants, peak times..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors"
                disabled={isQuerying}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isQuerying}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Ask
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
