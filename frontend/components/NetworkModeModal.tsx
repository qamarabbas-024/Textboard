'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface NetworkSettings {
  isOnlineModeEnabled: boolean;
  virustotalApiKey?: string;
  abuseIpDbApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
}

interface NetworkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: (isOnline: boolean) => void;
}

export function NetworkModeModal({
  isOpen,
  onClose,
  onSettingsChanged,
}: NetworkModeModalProps) {
  const [settings, setSettings] = useState<NetworkSettings>({
    isOnlineModeEnabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/online/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setSettings(data);
        })
        .catch((err) => console.error('Failed to load network settings:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/v1/online/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSaveSuccess(true);
        if (onSettingsChanged) onSettingsChanged(updated.isOnlineModeEnabled);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to save network settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="w-full max-w-xl rounded-3xl glass-card-3d border border-cyan-500/30 p-6 shadow-2xl space-y-6 relative overflow-hidden bg-[#070b16]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              {settings.isOnlineModeEnabled ? '🌐' : '🔒'}
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Network Policy &amp; Online Gateway
              </h2>
              <p className="text-[11px] text-neutral-400">
                Configure airgap isolation or enable cloud OSINT and frontier LLM reasoning.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Master Airgap Toggle Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          settings.isOnlineModeEnabled
            ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
            : 'bg-emerald-950/20 border-emerald-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {settings.isOnlineModeEnabled ? '🌐 Online Enhanced Mode' : '🔒 Airgap Mode (100% Offline)'}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  settings.isOnlineModeEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {settings.isOnlineModeEnabled ? 'CONNECTED' : 'ENFORCED'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                {settings.isOnlineModeEnabled
                  ? 'Permits selective external queries (VirusTotal, AbuseIPDB, Blockchain, Cloud LLM).'
                  : 'Zero external network calls. All analysis is strictly confined to local machine.'}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={settings.isOnlineModeEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, isOnlineModeEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>

        {/* API Credentials Configuration (Visible when Online Mode is Enabled) */}
        {settings.isOnlineModeEnabled && (
          <div className="space-y-4 pt-2 border-t border-white/[0.08] animate-fadeIn">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              Integration API Keys (Optional)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-300 flex items-center justify-between mb-1">
                  <span>Gemini 1.5 Pro API Key</span>
                  <span className="text-[10px] text-neutral-500">For deep whole-case reasoning</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter Google AI Studio Key (AIzaSy...)"
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                  className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 flex items-center justify-between mb-1">
                  <span>VirusTotal API Key</span>
                  <span className="text-[10px] text-neutral-500">For live URL threat scanning</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter VirusTotal API Key"
                  value={settings.virustotalApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, virustotalApiKey: e.target.value })}
                  className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 flex items-center justify-between mb-1">
                  <span>AbuseIPDB API Key</span>
                  <span className="text-[10px] text-neutral-500">For live IP reputation lookup</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter AbuseIPDB API Key"
                  value={settings.abuseIpDbApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, abuseIpDbApiKey: e.target.value })}
                  className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <span className="text-[11px] text-neutral-500">
            {saveSuccess ? '✓ Network policy updated successfully!' : 'Keys saved locally in secure workstation storage.'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-3d-primary font-bold shadow-lg"
            >
              {isSaving ? 'Saving...' : 'Apply Network Policy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
