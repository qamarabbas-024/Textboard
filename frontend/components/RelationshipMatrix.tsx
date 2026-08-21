import React from 'react';
import { UsersIcon, ClockIcon, ActivityIcon } from './Icons';

export interface RelationshipPair {
  actorA: string;
  actorB: string;
  totalExchanges: number;
  aToBInitiations: number;
  bToAInitiations: number;
  avgResponseSecsAtoB: number;
  avgResponseSecsBtoA: number;
  balanceRatio: number; // 0.5 is equal
}

interface RelationshipMatrixProps {
  relationships?: RelationshipPair[];
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

export function RelationshipMatrix({ relationships = [] }: RelationshipMatrixProps) {
  if (!relationships || relationships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
            PARTICIPANT RELATIONSHIP DYNAMICS & RESPONSE MATRIX
          </h3>
        </div>
        <span className="text-[11px] text-neutral-500">Pairwise Interaction Flow</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relationships.map((rel, idx) => {
          const aPercent = Math.round(rel.balanceRatio * 100);
          const bPercent = 100 - aPercent;

          return (
            <div
              key={`${rel.actorA}-${rel.actorB}-${idx}`}
              className="p-5 rounded-xl border border-white/[0.08] bg-[#10141d]/80 hover:border-cyan-500/40 transition-all space-y-4"
            >
              {/* Pair Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold text-xs">
                    {rel.actorA}
                  </span>
                  <span className="text-neutral-500 text-xs">⟷</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold text-xs">
                    {rel.actorB}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 font-bold">
                  {rel.totalExchanges.toLocaleString()} exchanges
                </span>
              </div>

              {/* Balance Ratio Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{rel.actorA} ({aPercent}%)</span>
                  <span>{rel.actorB} ({bPercent}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${aPercent}%` }}
                    title={`${rel.actorA}: ${aPercent}%`}
                  />
                  <div
                    className="h-full bg-purple-400 transition-all duration-300"
                    style={{ width: `${bPercent}%` }}
                    title={`${rel.actorB}: ${bPercent}%`}
                  />
                </div>
              </div>

              {/* Turn-taking & Response Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.05] text-[11px]">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-neutral-500 block truncate">{rel.actorA} INITIATED</span>
                  <span className="text-sm font-bold text-neutral-100">{rel.aToBInitiations} times</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Avg Reply: {rel.avgResponseSecsAtoB > 0 ? formatDuration(rel.avgResponseSecsAtoB) : 'N/A'}
                  </span>
                </div>

                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-neutral-500 block truncate">{rel.actorB} INITIATED</span>
                  <span className="text-sm font-bold text-neutral-100">{rel.bToAInitiations} times</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Avg Reply: {rel.avgResponseSecsBtoA > 0 ? formatDuration(rel.avgResponseSecsBtoA) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
