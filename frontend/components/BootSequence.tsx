'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LINES = [
  'INITIALIZING TEXTBOARD v0.4 CORE KERNEL...',
  'MOUNTING POSTGRESQL (105K+ RECORDS INDEXED)...',
  'ESTABLISHING REDIS MEMORY & FREQUENCY PIPELINES...',
  'INITIALIZING VIRTUALIZED TIMELINE & CHAT BUFFERS...',
  'SYSTEM READY >> ALL MODULES ONLINE.',
];

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Escape key listener to skip immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDone(true);
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  useEffect(() => {
    if (currentLineIndex >= BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setIsDone(true);
        onComplete();
      }, 300);
      return () => clearTimeout(timer);
    }

    const targetLine = BOOT_LINES[currentLineIndex];
    let charIndex = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      charIndex += 3;
      if (charIndex >= targetLine.length) {
        setDisplayedText(targetLine);
        clearInterval(interval);
        setTimeout(() => {
          setCurrentLineIndex((prev) => prev + 1);
        }, 180);
      } else {
        setDisplayedText(targetLine.slice(0, charIndex));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [currentLineIndex, onComplete]);

  if (isDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => {
          setIsDone(true);
          onComplete();
        }}
        className="fixed inset-0 z-50 bg-theme-base flex flex-col justify-between p-8 font-mono text-theme-text cursor-pointer select-none"
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-6 border-b border-theme-border pb-3">
            <span className="h-2.5 w-2.5 bg-theme-accent rounded-full animate-ping" />
            <span className="text-xs tracking-widest text-theme-accent font-bold uppercase">
              TEXTBOARD // BOOT SEQUENCE
            </span>
          </div>

          <div className="space-y-2 text-xs sm:text-sm">
            {BOOT_LINES.slice(0, currentLineIndex).map((line, idx) => (
              <div key={idx} className="text-theme-muted flex items-center gap-2">
                <span className="text-theme-dim">&gt;</span> {line}
              </div>
            ))}

            {currentLineIndex < BOOT_LINES.length && (
              <div className="text-theme-text font-semibold flex items-center gap-2">
                <span className="text-theme-accent">&gt;</span> {displayedText}
                <span className="inline-block w-2 h-4 bg-theme-accent animate-cursor" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-theme-dim border-t border-theme-border pt-3">
          <span>Click anywhere or press [ESC] to skip</span>
          <span>v0.4.0-PROD</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
