'use client';

import React, { useEffect, useState } from 'react';

export type ThemeMode = 'terminal' | 'soft' | 'minimal';

interface ThemeToggleProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function ThemeToggle({ currentTheme, onThemeChange }: ThemeToggleProps) {
  const themes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: 'terminal', label: 'Terminal', icon: '>_' },
    { id: 'soft', label: 'Soft', icon: '✦' },
    { id: 'minimal', label: 'Minimal', icon: '◻' },
  ];

  return (
    <div className="flex items-center bg-theme-raised border border-theme-border rounded-theme p-1 gap-1">
      {themes.map((t) => {
        const isActive = currentTheme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-theme transition-all ${
              isActive
                ? 'bg-theme-surface text-theme-accent font-semibold shadow-sm border border-theme-border-hi/40'
                : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            <span className="text-[10px] opacity-80">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
