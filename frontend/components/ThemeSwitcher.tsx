'use client';

import React, { useState, useEffect } from 'react';

export type AppTheme = 'obsidian' | 'slate' | 'matrix' | 'solar' | 'nordic';

export const THEMES: Array<{
  id: AppTheme;
  label: string;
  badge: string;
  desc: string;
  icon: string;
  dotColor: string;
}> = [
  {
    id: 'obsidian',
    label: 'Obsidian Neon',
    badge: 'CYBER',
    desc: 'Deep titanium obsidian with glowing cyan & emerald accents',
    icon: '⚡',
    dotColor: '#00f0ff',
  },
  {
    id: 'slate',
    label: 'Midnight Slate',
    badge: 'SLATE',
    desc: 'Modern indigo command deck with ice-blue highlights',
    icon: '🌌',
    dotColor: '#38bdf8',
  },
  {
    id: 'matrix',
    label: 'Hacker Matrix',
    badge: 'CRT',
    desc: 'Pure terminal black with phosphor green scanline vibes',
    icon: '🟩',
    dotColor: '#00ff66',
  },
  {
    id: 'solar',
    label: 'Solar Warm Paper',
    badge: 'LIGHT',
    desc: 'High-legibility warm cream editorial canvas with terracotta',
    icon: '☕',
    dotColor: '#c25934',
  },
  {
    id: 'nordic',
    label: 'Nordic Frost',
    badge: 'ARCTIC',
    desc: 'Arctic silver & slate with frosted ice-blue borders',
    icon: '❄️',
    dotColor: '#93c5fd',
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('obsidian');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('textboard_app_theme') as AppTheme;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
    } else {
      setTheme('obsidian');
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-active text-xs font-semibold text-theme-text transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:outline-none"
        title="Switch Visual Theme"
        aria-label="Select Visual Theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block animate-pulse shadow-sm"
          style={{ backgroundColor: activeThemeObj.dotColor }}
        />
        <span>{activeThemeObj.icon}</span>
        <span className="hidden sm:inline">{activeThemeObj.label}</span>
        <span className="text-[10px] text-theme-dim">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-theme-border bg-theme-surface shadow-2xl p-2 z-50 animate-fadeIn">
            <div className="text-[10px] uppercase tracking-wider text-theme-dim font-bold px-2 py-1 border-b border-theme-border mb-1 flex items-center justify-between">
              <span>Select Theme</span>
              <span className="text-[9px] text-theme-accent font-mono">5 STYLES</span>
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
                        ? 'bg-theme-active text-theme-accent border border-theme-border-hi shadow-xs'
                        : 'text-theme-text hover:bg-theme-raised border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: theme.dotColor }}
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1.5 text-theme-text">
                          <span>{theme.icon}</span>
                          <span>{theme.label}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded border border-theme-border text-theme-dim uppercase">
                            {theme.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-theme-muted leading-tight mt-0.5">
                          {theme.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <span className="text-theme-accent font-bold ml-1">✓</span>}
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
