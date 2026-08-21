import React from 'react';

export type ThemeId = 'obsidian' | 'solar' | 'matrix' | 'slate';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
}

export function ThemeSelector({ currentTheme, onSelectTheme }: ThemeSelectorProps) {
  const themes: Array<{ id: ThemeId; label: string; dotColor: string }> = [
    { id: 'obsidian', label: 'OBSIDIAN', dotColor: 'bg-cyan-400' },
    { id: 'solar', label: 'SOLAR', dotColor: 'bg-amber-600' },
    { id: 'matrix', label: 'MATRIX', dotColor: 'bg-emerald-400' },
    { id: 'slate', label: 'SLATE', dotColor: 'bg-indigo-400' },
  ];

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-[11px]">
      {themes.map((t) => {
        const isActive = currentTheme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTheme(t.id)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              isActive
                ? 'bg-white/[0.1] text-neutral-100 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title={`Switch to ${t.label} theme`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${t.dotColor}`} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
