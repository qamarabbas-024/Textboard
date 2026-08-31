'use client';

import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { VisualPdfStudioModal } from './VisualPdfStudioModal';
import { AudioSpeechStudio } from './AudioSpeechStudio';

export type ToolCategory = 'PDF' | 'CONVERT' | 'AUDIO' | 'SECURITY';

interface UniversalDocumentStudioProps {
  onOpenBatesModal?: () => void;
  onOpenPdfExport?: () => void;
}

export function UniversalDocumentStudio({
  onOpenBatesModal,
  onOpenPdfExport,
}: UniversalDocumentStudioProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('PDF');
  const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [conversionInput, setConversionInput] = useState<string>('');
  const [conversionOutput, setConversionOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('JSON_TO_CSV');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL - COURT EXHIBIT');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Conversion engine
  const handleRunConversion = () => {
    if (!conversionInput.trim()) {
      setStatusMessage('⚠️ Please provide input text or load a file first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Processing deterministic conversion...');

    setTimeout(() => {
      try {
        if (selectedFormat === 'JSON_TO_CSV') {
          const parsed = JSON.parse(conversionInput);
          const array = Array.isArray(parsed) ? parsed : [parsed];
          if (array.length === 0) throw new Error('Empty JSON array');
          const headers = Object.keys(array[0]);
          const rows = array.map((obj) =>
            headers.map((h) => `"${String(obj[h] ?? '').replace(/"/g, '""')}"`).join(',')
          );
          setConversionOutput([headers.join(','), ...rows].join('\n'));
          setStatusMessage('✓ Successfully converted JSON to CSV table.');
        } else if (selectedFormat === 'CSV_TO_JSON') {
          const lines = conversionInput.trim().split('\n');
          if (lines.length < 2) throw new Error('CSV requires at least header and one row');
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const result = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] || '';
            });
            return obj;
          });
          setConversionOutput(JSON.stringify(result, null, 2));
          setStatusMessage('✓ Successfully converted CSV to formatted JSON.');
        } else if (selectedFormat === 'TEXT_TO_MARKDOWN') {
          const formatted = conversionInput
            .split('\n')
            .map((line) => (line.trim().length > 0 ? `* ${line.trim()}` : ''))
            .join('\n');
          setConversionOutput(`# Extracted Document Overview\n\n${formatted}`);
          setStatusMessage('✓ Converted plain text to Markdown list.');
        } else if (selectedFormat === 'MARKDOWN_TO_HTML') {
          const html = conversionInput
            .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-cyan-400">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-white">$1</h2>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br/>');
          setConversionOutput(`<div class="document-body">\n${html}\n</div>`);
          setStatusMessage('✓ Converted Markdown to clean HTML snippet.');
        }
      } catch (err: any) {
        setStatusMessage(`❌ Conversion error: ${err.message || 'Invalid format'}`);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setConversionInput(content);
      setStatusMessage(`✓ Loaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-mono animate-fadeIn">
      {/* Top Header Card */}
      <section className="glass-card-3d p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0b1022] via-[#070b16] to-[#04060c] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/25">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide uppercase">
                  Universal Document &amp; PDF Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/40">
                  100% OFFLINE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Deterministic PDF manipulation, multi-format conversion, Bates stamping &amp; audio teleprompter
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/[0.08] text-xs">
            <button
              onClick={() => setActiveCategory('PDF')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'PDF'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              📕 PDF Tools
            </button>
            <button
              onClick={() => setActiveCategory('CONVERT')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'CONVERT'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🔄 Conversions
            </button>
            <button
              onClick={() => setActiveCategory('SECURITY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'SECURITY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ⚖️ Bates &amp; Redact
            </button>
            <button
              onClick={() => setActiveCategory('AUDIO')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'AUDIO'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🎙️ Audio STT
            </button>
          </div>
        </div>

        {/* Category 1: PDF Tools Grid */}
        {activeCategory === 'PDF' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
            <div className="glass-card-3d p-4 rounded-2xl border border-white/[0.08] hover:border-cyan-400/40 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">📑</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                  Dossier
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Forensic PDF Dossier</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Generate formal multi-column courtroom evidence binders with TrueType Unicode support.
                </p>
              </div>
              <Button
                variant="primary"
                size="xs"
                onClick={onOpenPdfExport}
                className="w-full btn-3d-primary font-bold"
              >
                Launch PDF Dossier Builder →
              </Button>
            </div>

            <div className="glass-card-3d p-4 rounded-2xl border border-white/[0.08] hover:border-cyan-400/40 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">⚖️</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                  Legal
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Bates Numbering &amp; Redaction</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Apply sequential exhibit numbers (EXHIBIT-0001) and mask credit cards, phones, and crypto wallets.
                </p>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={onOpenBatesModal}
                className="w-full font-bold"
              >
                Open Bates Stamping Studio →
              </Button>
            </div>

            <div className="glass-card-3d p-4 rounded-2xl border border-white/[0.08] hover:border-cyan-400/40 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🔄</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                  Interactive
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Visual Page Organizer &amp; Sign</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Rotate 90°, reorder pages, delete appendix sections, and apply digital examiner signatures.
                </p>
              </div>
              <Button
                variant="primary"
                size="xs"
                onClick={() => setIsVisualStudioOpen(true)}
                className="w-full btn-3d-primary font-bold"
              >
                Launch Visual Studio →
              </Button>
            </div>
          </div>
        )}

        {/* Category 2: Conversions Studio */}
        {activeCategory === 'CONVERT' && (
          <div className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Target Pipeline:</span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-black/60 border border-cyan-500/30 text-cyan-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="JSON_TO_CSV">JSON Array ➔ CSV Spreadsheet</option>
                  <option value="CSV_TO_JSON">CSV Spreadsheet ➔ Structured JSON</option>
                  <option value="TEXT_TO_MARKDOWN">Plain Text ➔ Formatted Markdown</option>
                  <option value="MARKDOWN_TO_HTML">Markdown ➔ Web HTML Document</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".json,.csv,.txt,.md"
                />
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Load Local File
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={handleRunConversion}
                  disabled={isProcessing}
                  className="btn-3d-primary font-bold"
                >
                  {isProcessing ? 'Converting...' : '⚡ Convert Now'}
                </Button>
              </div>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-cyan-300">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase">Input Payload</label>
                <textarea
                  value={conversionInput}
                  onChange={(e) => setConversionInput(e.target.value)}
                  placeholder="Paste JSON, CSV, or Text here, or click 'Load Local File'..."
                  rows={8}
                  className="w-full bg-[#04060c] border border-white/[0.1] rounded-2xl p-3 text-xs text-white font-mono focus:border-cyan-400 outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-400 uppercase">Output Result</label>
                  {conversionOutput && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(conversionOutput);
                        setStatusMessage('✓ Copied output to clipboard!');
                      }}
                      className="text-[10px] text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      📋 Copy Output
                    </button>
                  )}
                </div>
                <textarea
                  value={conversionOutput}
                  readOnly
                  placeholder="Converted output will appear here..."
                  rows={8}
                  className="w-full bg-[#04060c] border border-cyan-500/20 rounded-2xl p-3 text-xs text-emerald-300 font-mono outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Category 3: Security & Bates Studio */}
        {activeCategory === 'SECURITY' && (
          <div className="space-y-4 pt-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Courtroom Bates Stamping &amp; Evidence Vault</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Enforces continuous sequential stamping across hundreds of pages, masking PII and generating SHA-256 evidence digests.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenBatesModal}
                className="btn-3d-primary font-bold shrink-0"
              >
                ⚖️ Launch Bates Studio Modal
              </Button>
            </div>
          </div>
        )}

        {/* Category 4: Audio Speech-to-Text Studio */}
        {activeCategory === 'AUDIO' && (
          <div className="pt-5">
            <AudioSpeechStudio
              onInsertTranscription={(text) => {
                setConversionInput((prev) => (prev ? prev + '\n\n' + text : text));
                setStatusMessage('✓ Inserted voice transcription into conversion input.');
              }}
            />
          </div>
        )}
      </section>

      {/* Visual PDF Page Organizer & Signature Modal */}
      {isVisualStudioOpen && (
        <VisualPdfStudioModal
          isOpen={isVisualStudioOpen}
          onClose={() => setIsVisualStudioOpen(false)}
        />
      )}
    </div>
  );
}
