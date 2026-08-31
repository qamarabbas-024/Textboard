'use client';

import React, { useState, useEffect } from 'react';
import { safeFetch } from '../lib/api-client';
import { Button } from './ui/Button';

interface CryptoHit {
  type: string;
  address: string;
  count: number;
  actors: string[];
}

interface IpHit {
  ip: string;
  version: string;
  isPrivate: boolean;
  count: number;
  actors: string[];
}

interface FinancialHit {
  type: string;
  value: string;
  maskedValue?: string;
  count: number;
  actors: string[];
}

interface TelecomHit {
  rawNumber: string;
  countryCode?: string;
  countryName?: string;
  isBurnerVoipSuspect: boolean;
  count: number;
  actors: string[];
}

interface EntityReport {
  cryptoWallets: CryptoHit[];
  ipAddresses: IpHit[];
  financialEntities: FinancialHit[];
  telecomEntities: TelecomHit[];
  totalUniqueEntities: number;
}

interface EntityIntelligenceViewProps {
  datasetId: string;
}

export function EntityIntelligenceView({ datasetId }: EntityIntelligenceViewProps) {
  const [data, setData] = useState<EntityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'network' | 'financial' | 'telecom'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [osintResults, setOsintResults] = useState<Record<string, any>>({});
  const [osintLoading, setOsintLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!datasetId) return;
    setIsLoading(true);
    safeFetch(`/api/v1/analytics/${datasetId}/entities`)
      .then((res) => (res.ok ? res.json() : null))
      .then((report) => setData(report))
      .catch((err) => console.error('Failed to load entity intelligence:', err))
      .finally(() => setIsLoading(false));
  }, [datasetId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runOsintLookup = async (type: 'ip' | 'crypto', query: string, key: string, chain = 'BITCOIN') => {
    setOsintLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const endpoint =
        type === 'ip'
          ? `/api/v1/online/osint/ip?ip=${encodeURIComponent(query)}`
          : `/api/v1/online/osint/crypto?address=${encodeURIComponent(query)}&chain=${chain}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const result = await res.json();
        setOsintResults((prev) => ({ ...prev, [key]: result }));
      } else {
        const errJson = await res.json().catch(() => ({}));
        setOsintResults((prev) => ({
          ...prev,
          [key]: { error: errJson.message || 'Lookup blocked by airgap policy. Enable Online Mode in top bar.' },
        }));
      }
    } catch (err: any) {
      setOsintResults((prev) => ({ ...prev, [key]: { error: 'Failed to connect to OSINT gateway.' } }));
    } finally {
      setOsintLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-neutral-400 font-mono space-y-3 glass-card-3d rounded-3xl border border-cyan-500/20">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
        <p>Scanning stream for cryptographic wallets, network IPs, and financial indicators...</p>
      </div>
    );
  }

  if (!data || data.totalUniqueEntities === 0) {
    return (
      <div className="p-12 text-center text-xs text-neutral-400 font-mono space-y-3 glass-card-3d rounded-3xl border border-white/[0.08]">
        <span className="text-3xl">🛡️</span>
        <h3 className="text-sm font-bold text-white">No Threat Entities Detected</h3>
        <p className="text-neutral-500 max-w-md mx-auto">
          No cryptocurrency addresses, public IP addresses, credit cards, or international phone numbers were found in this dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl glass-card-3d border border-cyan-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 uppercase">
                AUTOMATED THREAT INTEL &amp; ENTITY EXTRACTOR
              </span>
              <span className="text-[10px] text-neutral-400">100% Airgapped</span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
              Extracted Forensic Artifacts &amp; Intelligence Leads
            </h2>
          </div>
        </div>

        {/* Metric Summary Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
            🪙 Crypto: <strong className="text-cyan-300">{data.cryptoWallets.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
            🌐 IPs: <strong className="text-purple-300">{data.ipAddresses.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
            💳 Financial: <strong className="text-emerald-300">{data.financialEntities.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
            📞 Telecom: <strong className="text-amber-300">{data.telecomEntities.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `ALL ENTITIES (${data.totalUniqueEntities})` },
          { id: 'crypto', label: `🪙 CRYPTO WALLETS (${data.cryptoWallets.length})` },
          { id: 'network', label: `🌐 NETWORK IPS (${data.ipAddresses.length})` },
          { id: 'financial', label: `💳 FINANCIAL (${data.financialEntities.length})` },
          { id: 'telecom', label: `📞 TELECOM (${data.telecomEntities.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-sm'
                : 'text-neutral-400 hover:text-white bg-black/30 border border-white/[0.05]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entity Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Crypto Wallets */}
        {(activeTab === 'all' || activeTab === 'crypto') &&
          data.cryptoWallets.map((w, idx) => {
            const key = `crypto-${idx}`;
            const osint = osintResults[key];
            const isLoadingOsint = osintLoading[key];

            return (
              <div key={key} className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-3 hover:border-cyan-400/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold uppercase">
                    🪙 {w.type}
                  </span>
                  <span className="text-[11px] text-neutral-400">{w.count} mentions</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#04060c] p-2 rounded-lg border border-white/[0.08]">
                  <code className="text-xs text-white font-mono truncate">{w.address}</code>
                  <button
                    onClick={() => copyToClipboard(w.address, key)}
                    className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer shrink-0"
                  >
                    {copiedKey === key ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="text-neutral-400">
                    Actors: <span className="text-neutral-200">{w.actors.join(', ')}</span>
                  </div>
                  <button
                    onClick={() => runOsintLookup('crypto', w.address, key, w.type)}
                    disabled={isLoadingOsint}
                    className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 text-[10px] font-bold cursor-pointer transition-all"
                  >
                    {isLoadingOsint ? '⚡ Querying...' : '⚡ Check Blockchain'}
                  </button>
                </div>

                {osint && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-mono animate-fadeIn ${
                    osint.error ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                  }`}>
                    {osint.error ? (
                      <div>⚠️ {osint.error}</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Live Balance:</span>
                          <strong className="text-white">{osint.balanceFormatted}</strong>
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>Total Received: {osint.totalReceivedFormatted}</span>
                          <span>Tx Count: {osint.totalTransactions}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* 2. Network IPs */}
        {(activeTab === 'all' || activeTab === 'network') &&
          data.ipAddresses.map((ip, idx) => {
            const key = `ip-${idx}`;
            const osint = osintResults[key];
            const isLoadingOsint = osintLoading[key];

            return (
              <div key={key} className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-3 hover:border-purple-400/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                    ip.isPrivate
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    🌐 {ip.isPrivate ? 'PRIVATE LAN IP' : 'PUBLIC INTERNET HOST'}
                  </span>
                  <span className="text-[11px] text-neutral-400">{ip.count} hits</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#04060c] p-2 rounded-lg border border-white/[0.08]">
                  <code className="text-xs text-purple-300 font-mono font-bold">{ip.ip}</code>
                  <button
                    onClick={() => copyToClipboard(ip.ip, key)}
                    className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 cursor-pointer shrink-0"
                  >
                    {copiedKey === key ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="text-neutral-400">
                    Actors: <span className="text-neutral-200">{ip.actors.join(', ')}</span>
                  </div>
                  <button
                    onClick={() => runOsintLookup('ip', ip.ip, key)}
                    disabled={isLoadingOsint}
                    className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:bg-purple-500/30 text-[10px] font-bold cursor-pointer transition-all"
                  >
                    {isLoadingOsint ? '🔍 Scanning...' : '🔍 Live Threat Scan'}
                  </button>
                </div>

                {osint && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-mono animate-fadeIn ${
                    osint.error ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                  }`}>
                    {osint.error ? (
                      <div>⚠️ {osint.error}</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Abuse Confidence:</span>
                          <strong className={osint.isMalicious ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {osint.abuseConfidenceScore}% {osint.isMalicious ? '(MALICIOUS)' : '(CLEAN)'}
                          </strong>
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>ISP: {osint.isp}</span>
                          <span>Reports: {osint.totalReports}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* 3. Financial Entities */}
        {(activeTab === 'all' || activeTab === 'financial') &&
          data.financialEntities.map((fin, idx) => (
            <div key={`fin-${idx}`} className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2 hover:border-emerald-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  💳 {fin.type}
                </span>
                <span className="text-[11px] text-neutral-400">{fin.count} mentions</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#04060c] p-2 rounded-lg border border-white/[0.08]">
                <code className="text-xs text-emerald-300 font-mono font-bold">{fin.maskedValue || fin.value}</code>
                <button
                  onClick={() => copyToClipboard(fin.value, `fin-${idx}`)}
                  className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer shrink-0"
                >
                  {copiedKey === `fin-${idx}` ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-[10px] text-neutral-400">
                Actors: <span className="text-neutral-200">{fin.actors.join(', ')}</span>
              </div>
            </div>
          ))}

        {/* 4. Telecom Entities */}
        {(activeTab === 'all' || activeTab === 'telecom') &&
          data.telecomEntities.map((tel, idx) => (
            <div key={`tel-${idx}`} className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2 hover:border-amber-400/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    📞 {tel.countryName || 'INTERNATIONAL'}
                  </span>
                  {tel.isBurnerVoipSuspect && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      SUSPECT VOIP BURNER
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-400">{tel.count} mentions</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#04060c] p-2 rounded-lg border border-white/[0.08]">
                <code className="text-xs text-amber-200 font-mono font-bold">{tel.rawNumber}</code>
                <button
                  onClick={() => copyToClipboard(tel.rawNumber, `tel-${idx}`)}
                  className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 cursor-pointer shrink-0"
                >
                  {copiedKey === `tel-${idx}` ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-[10px] text-neutral-400">
                Actors: <span className="text-neutral-200">{tel.actors.join(', ')}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
