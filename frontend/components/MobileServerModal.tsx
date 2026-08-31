'use client';

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl, setApiBaseUrl } from '../lib/api-client';
import { Button } from './ui/Button';

interface MobileServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function MobileServerModal({ isOpen, onClose, onRefresh }: MobileServerModalProps) {
  const [serverUrl, setServerUrl] = useState('');
  const [currentBase, setCurrentBase] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const base = getApiBaseUrl();
      setCurrentBase(base);
      setServerUrl(base);
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBaseUrl(serverUrl);
    setCurrentBase(serverUrl);
    onRefresh();
    onClose();
  };

  const handleResetOffline = () => {
    setApiBaseUrl('');
    setCurrentBase('');
    setServerUrl('');
    onRefresh();
    onClose();
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setTestStatus('Using Standalone Offline Engine (No remote server required)');
      return;
    }

    setTestStatus('Testing connection...');
    try {
      let formatted = serverUrl.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      const res = await fetch(`${formatted}/api/v1/datasets`, { method: 'GET' });
      if (res.ok) {
        setTestStatus('✓ Connection Successful! Workstation reached.');
      } else {
        setTestStatus(`⚠️ Server responded with HTTP ${res.status}`);
      }
    } catch (err) {
      setTestStatus('❌ Cannot reach workstation at this IP. Make sure PC & Phone are on same Wi-Fi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="w-full max-w-md rounded-3xl glass-card-3d border border-cyan-500/30 p-6 shadow-2xl space-y-5 bg-[#070b16]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📱</span>
            <div>
              <h3 className="text-sm font-bold text-white">Mobile Workstation Bridge</h3>
              <p className="text-[10px] text-neutral-400">Configure PC Server IP or use Offline Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {/* Current Mode Badge */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Current Mode:</span>
            {currentBase ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                🌐 Connected to PC
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 text-[10px]">
                🔒 100% Offline Standalone
              </span>
            )}
          </div>
          {currentBase && (
            <p className="text-[10px] text-neutral-300 truncate font-mono">Target: {currentBase}</p>
          )}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-[11px] text-cyan-300 font-bold block">
            Workstation Host IP (Optional)
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="e.g. http://192.168.1.105:3891"
            className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
          />
          <p className="text-[10px] text-neutral-500 leading-tight">
            Leave blank to run 100% offline using your phone's built-in memory engine.
          </p>
        </div>

        {testStatus && (
          <div className="p-2.5 rounded-xl bg-[#04060c] border border-white/[0.08] text-[11px] text-cyan-300">
            {testStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="xs" onClick={handleTestConnection} className="flex-1">
              🔍 Test Ping
            </Button>
            <Button variant="primary" size="xs" onClick={handleSave} className="btn-3d-primary flex-1 font-bold">
              💾 Save &amp; Connect
            </Button>
          </div>
          <Button variant="ghost" size="xs" onClick={handleResetOffline} className="text-neutral-400 hover:text-white">
            Use Standalone Offline Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
