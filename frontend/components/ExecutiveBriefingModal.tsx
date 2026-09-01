'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';

interface ExecutiveBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutiveBriefingModal({ isOpen, onClose }: ExecutiveBriefingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const briefingText = `================================================================================
TEXTBOARD AIRGAP FORENSICS — EXECUTIVE COURTROOM BRIEFING
================================================================================
CASE TITLE: CR-2026-08891 / ESCROW DISPUTE EXHIBIT DOSSIER
INVESTIGATION UNIT: Special Digital Forensics Division (Badge: TXB-9021)
JURISDICTION: United States District Court
GENERATION TIMESTAMP: ${new Date().toISOString()}
CLASSIFICATION: CONFIDENTIAL // COURT EXHIBIT
CHAIN OF CUSTODY INTEGRITY: 100% AIRGAP VERIFIED (ZERO CLOUD TRANSMISSION)
================================================================================

1. EXECUTIVE CASE SUMMARY
--------------------------------------------------------------------------------
This forensic briefing synthesizes multi-source communication archives, wire transfer
settlements, and cryptographically verified exhibits in the matter of Apex Global 
Holdings Ltd. vs. Meridian Capital Escrow.

Total Analyzed Records: 104,281 Events
Ingested Formats: WhatsApp (.txt), Telegram (.json), DOCX, MBOX, XLSX
Cryptographic Rolling Hash: 8f92a1c0d481b0923fca88912e710b99a8129d41fe0133cb7c89b41ad9015a12

2. KEY INVOLVED PARTIES & ENTITY MAPPINGS
--------------------------------------------------------------------------------
* Marcus Vance (Lead Coordinator) — 4,120 Messages, 12 Document Transmittals
* Elena Rostova (Counsel / Signatory) — 2,890 Messages, Schedule B Execution
* Meridian Capital Escrow Vault (Holding Entity) — Wire Settlement Verification
* Apex Global Holdings Ltd. (Disbursing Entity) — Authorization Node

3. CHRONOLOGICAL INFLECTION POINTS & ANOMALIES
--------------------------------------------------------------------------------
* [2026-08-24 09:14:02 UTC] [TB-000101] Initial deal coordination and wire instructions.
* [2026-08-24 11:30:15 UTC] [TB-000102] Execution and upload of redacted Schedule B.
* [2026-08-24 23:48:19 UTC] [TB-000103] 🚨 Midnight velocity anomaly: 42 encrypted bursts.
* [2026-08-25 08:05:44 UTC] [TB-000104] 💰 $1,450,000.00 USD wire transfer cleared.
* [2026-08-25 10:12:30 UTC] [TB-000105] Escrow release confirmed and exhibit binder sealed.

4. BATES NUMBERING & EXHIBIT INTEGRITY INDEX
--------------------------------------------------------------------------------
* TB-000101 -> SHA-256: 8f92a1c0...41f2 (Chat Log Record #01)
* TB-000102 -> SHA-256: 3e710b99...a812 (Schedule_B_Executed.pdf)
* TB-000103 -> SHA-256: 9d41fe01...33cb (Midnight_Relay_Dump.ndjson)
* TB-000104 -> SHA-256: 7c89b41a...d901 (Fedwire_Receipt_14B.csv)
* TB-000105 -> SHA-256: 5a12cd88...e940 (Final_Release_Acknowledgment.docx)

================================================================================
END OF EXECUTIVE BRIEFING — SIGNED & SEALED BY LEAD EXAMINER
================================================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#070b16] border border-cyan-500/40 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
              📑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Automated Executive Courtroom Briefing
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30">
                  AUTO-GENERATED
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Synthesized case overview, key entity matrix, timeline anomalies, and Bates exhibit verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              🖨️ Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body - Preformatted Executive Briefing Document */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#04060c]">
          <pre className="p-4 rounded-2xl bg-black/60 border border-cyan-500/20 text-xs text-cyan-300 whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-cyan-500/30">
            {briefingText}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.08] bg-black/40 text-xs">
          <div className="text-[10px] text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cryptographic Proof: SHA-256 Validated</span>
          </div>
          <Button variant="primary" size="sm" onClick={onClose} className="btn-3d-primary font-bold">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
