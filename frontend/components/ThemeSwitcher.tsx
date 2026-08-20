'use client';

import React, { useState, useEffect } from 'react';

export type AppTheme = 'slate' | 'matrix' | 'cyberpunk' | 'nordic' | 'cream';

const THEMES: Array<{
  id: AppTheme;
  label: string;
  badge: string;
  desc: string;
  icon: string;
  dotColor: string;
}> = [
  {
    id: 'matrix',
    label: 'Hacker Matrix',
    badge: 'TERMINAL',
    desc: 'Phosphor green, CRT scanlines, command-line vibes',
    icon: '🟩',
    dotColor: '#22c55e',
  },
  {
    id: 'cyberpunk',
    label: 'Obsidian Neon',
    badge: 'CYBERPUNK',
    desc: 'Deep obsidian with glowing cyan & rose accents',
    icon: '⚡',
    dotColor: '#06b6d4',
  },
  {
    id: 'slate',
    label: 'Midnight Slate',
    badge: 'DEFAULT',
    desc: 'Modern dark glassmorphic command center',
    icon: '🌌',
    dotColor: '#38bdf8',
  },
  {
    id: 'nordic',
    label: 'Nordic Frost',
    badge: 'MINIMAL',
    desc: 'Ice blue & slate with titanium borders',
    icon: '❄️',
    dotColor: '#93c5fd',
  },
  {
    id: 'cream',
    label: 'Eye-Care Warm',
    badge: 'WARM',
    desc: 'Low-strain warm cream reading canvas',
    icon: '☕',
    dotColor: '#d97706',
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('slate');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('textboard_app_theme') as AppTheme;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
    }
  }, []);

  const setTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('textboard_app_theme', theme);
    const root = document.documentElement;
    if (theme === 'slate') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[2];

  return (
    <div className="relative inline-block text-left font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-[#141a24]/90 hover:bg-white/[0.08] text-xs font-semibold text-neutral-200 transition-all shadow-xs"
        title="Switch Visual Theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block animate-pulse shadow-sm"
          style={{ backgroundColor: activeThemeObj.dotColor }}
        />
        <span>{activeThemeObj.icon}</span>
        <span className="hidden sm:inline">{activeThemeObj.label}</span>
        <span className="text-[10px] text-neutral-500">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.15] bg-[#0d121c]/95 backdrop-blur-md shadow-2xl p-2 z-50 animate-fadeIn">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold px-2 py-1 border-b border-white/[0.08] mb-1">
              Select Visual Theme
            </div>
            <div className="space-y-1">
              {THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: theme.dotColor }}
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{theme.icon}</span>
                          <span>{theme.label}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-tight">
                          {theme.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <span className="text-cyan-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
