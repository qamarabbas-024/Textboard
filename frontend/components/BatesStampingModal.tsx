'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';

interface BatesStampedEvent {
  batesNumber: string;
  originalId: string;
  actor: string;
  content: string;
  timestamp: string;
  redactionsCount: number;
}

interface BatesStampingResult {
  totalStamped: number;
  totalRedactions: number;
  firstBatesNumber: string;
  lastBatesNumber: string;
  events: BatesStampedEvent[];
}

interface BatesStampingModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
}

export function BatesStampingModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: BatesStampingModalProps) {
  const [prefix, setPrefix] = useState('EXHIBIT');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(4);
  const [suffix, setSuffix] = useState('CONFIDENTIAL');
  const [enableRedaction, setEnableRedaction] = useState(true);
  const [redactCreditCards, setRedactCreditCards] = useState(true);
  const [redactPhoneNumbers, setRedactPhoneNumbers] = useState(true);
  const [redactCryptoWallets, setRedactCryptoWallets] = useState(true);
  const [redactIpAddresses, setRedactIpAddresses] = useState(true);
  const [customKeywordsInput, setCustomKeywordsInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BatesStampingResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const customKeywords = customKeywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch(`/api/v1/privacy/${datasetId}/bates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix,
          startNumber,
          digits,
          suffix: suffix || undefined,
          enableRedaction,
          redactCreditCards,
          redactPhoneNumbers,
          redactCryptoWallets,
          redactIpAddresses,
          customKeywords,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error('Failed to generate Bates stamping:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!result || result.events.length === 0) return;

    const headers = ['Bates Number', 'Original ID', 'Actor', 'Timestamp', 'Redactions Count', 'Content'];
    const rows = result.events.map((e) => [
      `"${e.batesNumber}"`,
      `"${e.originalId}"`,
      `"${e.actor.replace(/"/g, '""')}"`,
      `"${e.timestamp}"`,
      e.redactionsCount,
      `"${e.content.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${datasetName}_Bates_${result.firstBatesNumber}_to_${result.lastBatesNumber}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl glass-card-3d border border-cyan-500/30 p-6 shadow-2xl space-y-6 flex flex-col bg-[#070b16] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              ⚖️
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Legal Bates Stamping &amp; PII Redaction Studio
              </h2>
              <p className="text-[11px] text-neutral-400">
                Generate sequential court exhibit stamps and anonymize sensitive PII before legal export.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0 bg-black/40 p-4 rounded-2xl border border-white/[0.08]">
          <div>
            <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">Bates Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">Start Number</label>
            <input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">Padded Digits</label>
            <input
              type="number"
              min={3}
              max={8}
              value={digits}
              onChange={(e) => setDigits(parseInt(e.target.value, 10) || 4)}
              className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-cyan-300 font-bold block mb-1">Suffix (Optional)</label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
              className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* Redaction Toggles */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span>🛡️ Automated PII Redaction Filters</span>
              <span className="text-[10px] text-neutral-400">Replaces sensitive items with court-standard redactions</span>
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableRedaction}
                onChange={(e) => setEnableRedaction(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {enableRedaction && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/[0.05] text-[11px]">
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redactCreditCards}
                  onChange={(e) => setRedactCreditCards(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Credit Cards</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redactPhoneNumbers}
                  onChange={(e) => setRedactPhoneNumbers(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Phone Numbers</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redactCryptoWallets}
                  onChange={(e) => setRedactCryptoWallets(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Crypto Wallets</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redactIpAddresses}
                  onChange={(e) => setRedactIpAddresses(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>IP Addresses</span>
              </label>
            </div>
          )}

          {enableRedaction && (
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">
                Custom Redaction Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={customKeywordsInput}
                onChange={(e) => setCustomKeywordsInput(e.target.value)}
                placeholder="e.g. Project Manhattan, Top Secret, Operation Phoenix"
                className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          )}
        </div>

        {/* Preview Results Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#04060c] p-3 space-y-2">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
              <p>Stamping sequential Bates IDs &amp; executing redaction passes...</p>
            </div>
          ) : result ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/30 text-xs">
                <div>
                  <span className="text-neutral-400">Stamped Range: </span>
                  <strong className="text-cyan-300">{result.firstBatesNumber}</strong>
                  <span className="text-neutral-500"> → </span>
                  <strong className="text-cyan-300">{result.lastBatesNumber}</strong>
                </div>
                <div className="flex items-center gap-3">
                  <span>Total Records: <strong className="text-white">{result.totalStamped}</strong></span>
                  <span>Redactions: <strong className="text-rose-400">{result.totalRedactions}</strong></span>
                </div>
              </div>

              <div className="space-y-1.5">
                {result.events.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05] hover:border-cyan-500/30 transition-all text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30 text-[10px]">
                        {ev.batesNumber}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                        <span>{ev.actor}</span>
                        <span>•</span>
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        {ev.redactionsCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                            {ev.redactionsCount} REDACTIONS
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-neutral-200 text-[11px] font-sans leading-relaxed">{ev.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-neutral-500 space-y-1">
              <span className="text-2xl">⚖️</span>
              <p>Configure your Bates stamping scheme and click "Generate Exhibit Stamping" to preview.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={isLoading}
              className="font-bold"
            >
              {isLoading ? 'Processing...' : '⚡ Generate Exhibit Stamping'}
            </Button>

            {result && result.events.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCsv}
                className="btn-3d-primary font-bold shadow-lg"
              >
                📥 Export Bates CSV Exhibit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
