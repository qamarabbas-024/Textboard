'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LOGS = [
  { text: 'TEXTBOARD WORKSTATION // LOCAL-FIRST INTELLIGENCE CORE', type: 'header', delay: 110 },
  { text: 'LOCAL ENGINE: Zero-Cloud Processing Sandbox [INITIALIZED]', type: 'system', delay: 75 },
  { text: 'STORAGE: Mounting Local SQLite WAL Database (archive_local.db)...', type: 'info', delay: 85 },
  { text: 'PARSERS: Loaded 10+ Universal Stream Parsers (Chat, AI/LLM, Discord, Slack, XLSX)...', type: 'info', delay: 80 },
  { text: 'UNICODE: Dynamic TrueType Multi-Script & Emoji Resolver [MOUNTED]', type: 'success', delay: 75 },
  { text: 'VERIFIER: Cryptographic SHA-256 Rolling Digest Subsystem [ACTIVE]', type: 'success', delay: 80 },
  { text: 'VISUAL: 5-Theme High-Fidelity Canvas Workstation [LOADED]', type: 'success', delay: 75 },
  { text: '>> WORKSTATION ONLINE. ALL LOCAL SUBSYSTEMS VERIFIED.', type: 'ready', delay: 120 },
];

interface BootSequenceProps {
  onComplete: () => void;
  forceShow?: boolean;
}

export function BootSequence({ onComplete, forceShow = false }: BootSequenceProps) {
  const [completedLines, setCompletedLines] = useState<number>(0);
  const [currentChars, setCurrentChars] = useState<string>('');
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const handleFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('textboard_booted', 'true');
      } catch {}
    }
    setIsSkipped(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  }, [onComplete]);

  // Check if already booted in session or reduced motion preferred
  useEffect(() => {
    if (!forceShow && typeof window !== 'undefined') {
      const alreadyBooted = sessionStorage.getItem('textboard_booted');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (alreadyBooted || prefersReducedMotion) {
        onComplete();
        return;
      }
    }
  }, [forceShow, onComplete]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  // Progressive terminal log rendering
  useEffect(() => {
    if (isSkipped) return;
    if (completedLines >= BOOT_LOGS.length) {
      const finishTimeout = setTimeout(() => {
        handleFinish();
      }, 400);
      return () => clearTimeout(finishTimeout);
    }

    const currentLog = BOOT_LOGS[completedLines];
    let charIdx = 0;
    setCurrentChars('');

    const typeInterval = setInterval(() => {
      charIdx += 4; // Fast, responsive typing speed
      if (charIdx >= currentLog.text.length) {
        setCurrentChars(currentLog.text);
        clearInterval(typeInterval);
        setCompletedLines((prev) => prev + 1);
        setProgressPercent(Math.round(((completedLines + 1) / BOOT_LOGS.length) * 100));
      } else {
        setCurrentChars(currentLog.text.slice(0, charIdx));
      }
    }, 14);

    return () => clearInterval(typeInterval);
  }, [completedLines, isSkipped, handleFinish]);

  if (isSkipped) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.25 }}
        onClick={handleFinish}
        className="fixed inset-0 z-50 bg-[#04060a] flex flex-col justify-between p-6 sm:p-10 font-mono text-neutral-200 select-none cursor-pointer overflow-hidden"
      >
        {/* CRT Scanline & Ambient Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 workstation-scanline pointer-events-none opacity-40" />

        {/* Header Bar */}
        <div className="relative z-10 max-w-4xl w-full mx-auto">
          <div className="flex items-center justify-between border-b border-white/[0.1] pb-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase">
                  TEXTBOARD WORKSTATION // BOOT TELEMETRY
                </span>
                <span className="text-[10px] text-neutral-500">SYSTEM STARTUP & INTEGRITY VERIFICATION</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                {progressPercent}%
              </span>
              <span className="text-[11px] text-neutral-500 hidden sm:inline font-bold">v2.0.0</span>
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="space-y-2 text-xs sm:text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
            {BOOT_LOGS.slice(0, completedLines).map((log, idx) => {
              let colorClass = 'text-neutral-400';
              let prefix = '>';
              if (log.type === 'header') {
                colorClass = 'text-cyan-300 font-bold';
                prefix = '●';
              } else if (log.type === 'success') {
                colorClass = 'text-emerald-400 font-semibold';
                prefix = '✓';
              } else if (log.type === 'ready') {
                colorClass = 'text-cyan-400 font-bold bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/30 inline-block';
                prefix = '★';
              }

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`flex items-start gap-2.5 ${colorClass}`}
                >
                  <span className="text-neutral-600 shrink-0 font-bold">{prefix}</span>
                  <span>{log.text}</span>
                </motion.div>
              );
            })}

            {/* Currently Typing Line */}
            {completedLines < BOOT_LOGS.length && (
              <div className="text-white font-medium flex items-center gap-2.5">
                <span className="text-cyan-400 shrink-0 font-bold">&gt;</span>
                <span>{currentChars}</span>
                <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar & Footer Instructions */}
        <div className="relative z-10 max-w-4xl w-full mx-auto border-t border-white/[0.1] pt-4 mt-6">
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-300 font-bold text-[10px]">
                SPACE
              </span>
              <span>or</span>
              <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-300 font-bold text-[10px]">
                ESC
              </span>
              <span>to skip boot sequence</span>
            </div>
            <span className="text-cyan-500/70 font-bold tracking-wider">CLICK ANYWHERE TO LAUNCH</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
