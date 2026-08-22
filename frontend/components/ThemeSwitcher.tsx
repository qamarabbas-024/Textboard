'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AppTheme = 'cyberpunk' | 'tokyo' | 'matrix' | 'nebula' | 'diamond';

export const THEMES: Array<{
  id: AppTheme;
  label: string;
  badge: string;
  desc: string;
  icon: string;
  gradient: string;
  dotColor: string;
}> = [
  {
    id: 'cyberpunk',
    label: 'Cyber Hyperdrive',
    badge: 'NEON',
    desc: 'Electric Cyan & Hyper Violet with void deep abyss',
    icon: '⚡',
    gradient: 'from-cyan-400 to-purple-600',
    dotColor: '#00f0ff',
  },
  {
    id: 'tokyo',
    label: 'Tokyo Syndicate',
    badge: '2077',
    desc: 'Hot Neon Magenta & Cyber Gold with carbon darks',
    icon: '🌆',
    gradient: 'from-rose-500 to-amber-400',
    dotColor: '#ff0055',
  },
  {
    id: 'matrix',
    label: 'Emerald Quantum',
    badge: 'HOLO',
    desc: 'Bioluminescent Mint & Emerald hologram matrix',
    icon: '🟢',
    gradient: 'from-emerald-400 to-lime-300',
    dotColor: '#00ff88',
  },
  {
    id: 'nebula',
    label: 'Nebula Sunset',
    badge: 'COSMIC',
    desc: 'Cosmic Indigo & Sunset Coral vaporwave glass',
    icon: '🌌',
    gradient: 'from-rose-400 via-purple-500 to-indigo-600',
    dotColor: '#ff6b6b',
  },
  {
    id: 'diamond',
    label: 'Executive Diamond',
    badge: 'LUXURY',
    desc: 'Crisp Frosted Titanium & Royal Sapphire Blue',
    icon: '💎',
    gradient: 'from-sky-400 to-blue-600',
    dotColor: '#38bdf8',
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('cyberpunk');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('textboard_app_theme') as AppTheme;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
    } else {
      setTheme('cyberpunk');
    }
  }, []);

  const setTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('textboard_app_theme', theme);
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  };

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative inline-block text-left font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme-border bg-theme-surface/80 hover:bg-theme-surface-raised text-xs font-semibold text-theme-text transition-all shadow-lg hover:border-cyan-400/50 backdrop-blur-md"
        title="Switch Visual Theme"
        aria-label="Select Visual Theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block animate-pulse shadow-sm"
          style={{ backgroundColor: activeThemeObj.dotColor }}
        />
        <span>{activeThemeObj.icon}</span>
        <span className="hidden sm:inline font-bold">{activeThemeObj.label}</span>
        <span className="text-[10px] text-theme-dim">▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 rounded-2xl border border-theme-border/80 bg-theme-surface/95 shadow-2xl p-2.5 z-50 backdrop-blur-2xl"
            >
              <div className="text-[10px] uppercase tracking-wider text-theme-dim font-bold px-2 py-1 border-b border-theme-border/40 mb-1.5 flex items-center justify-between">
                <span>Select Workstation Theme</span>
                <span className="text-cyan-400 font-bold">{THEMES.length} Palettes</span>
              </div>

              <div className="space-y-1">
                {THEMES.map((theme) => {
                  const isActive = currentTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setTheme(theme.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-theme-surface-raised border border-cyan-400/50 shadow-md'
                          : 'hover:bg-theme-surface-raised/60 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 bg-gradient-to-br ${theme.gradient} shadow-sm`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isActive ? 'text-cyan-400' : 'text-theme-text'
                            }`}
                          >
                            {theme.label}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                : 'bg-theme-surface text-theme-dim'
                            }`}
                          >
                            {theme.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-theme-muted mt-0.5 line-clamp-1">
                          {theme.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
