'use client';

import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '?', desc: 'Toggle Keyboard Shortcuts Sheet', category: 'General' },
    { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette & Global Search', category: 'General' },
    { key: '1 - 7', desc: 'Direct Navigation to Tabs (Home, Data, Explore, Search, etc.)', category: 'Navigation' },
    { key: 'Ctrl + Shift + P', desc: 'Quick Export Forensic PDF Dossier', category: 'PDF & Exhibits' },
    { key: 'Ctrl + Shift + B', desc: 'Launch Courtroom Bates Stamping & PII Redaction', category: 'PDF & Exhibits' },
    { key: 'Space', desc: 'Play / Pause Forensic Audio Podcast Player', category: 'Audio Studio' },
    { key: 'Esc', desc: 'Close Active Modal / Drawer Overlay', category: 'General' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="w-full max-w-xl bg-[#070b16] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-base shadow-sm">
              ⌨️
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-sm font-black text-white uppercase tracking-wider">
                Keyboard Shortcuts &amp; Accessibility Guide
              </h3>
              <p className="text-xs text-neutral-400">Power user key bindings for high-speed workstation operation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition-all cursor-pointer"
            aria-label="Close Shortcuts"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-[#04060c] border border-white/[0.06] hover:border-cyan-500/30 transition-all"
            >
              <span className="text-xs text-neutral-300 font-sans">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/[0.15] text-cyan-300 text-xs font-bold font-mono shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 text-center">
          <p className="text-[11px] text-neutral-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">Esc</kbd> anytime to dismiss overlays.
          </p>
        </div>
      </div>
    </div>
  );
}
