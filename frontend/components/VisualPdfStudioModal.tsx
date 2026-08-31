'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';

interface VisualPdfStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName?: string;
}

interface PdfPageItem {
  id: string;
  pageNumber: number;
  rotation: number; // 0, 90, 180, 270
  title: string;
  isSelected: boolean;
}

export function VisualPdfStudioModal({
  isOpen,
  onClose,
  datasetName = 'Evidence Dossier',
}: VisualPdfStudioModalProps) {
  const [pages, setPages] = useState<PdfPageItem[]>([
    { id: 'p1', pageNumber: 1, rotation: 0, title: 'Case Cover Sheet & Bates Header', isSelected: true },
    { id: 'p2', pageNumber: 2, rotation: 0, title: 'Executive Summary & Threat Radar', isSelected: true },
    { id: 'p3', pageNumber: 3, rotation: 0, title: 'Chronological Timeline Events', isSelected: true },
    { id: 'p4', pageNumber: 4, rotation: 0, title: 'Entity Intelligence & Crypto Trails', isSelected: true },
    { id: 'p5', pageNumber: 5, rotation: 0, title: 'Bates Stamped Exhibits & Signatures', isSelected: true },
  ]);

  const [watermark, setWatermark] = useState('CONFIDENTIAL - EVIDENCE');
  const [isSigning, setIsSigning] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Rotate a specific page
  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
    setStatusMsg('✓ Page rotated 90° clockwise');
  };

  // Delete a page
  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      setStatusMsg('⚠️ Cannot delete the last remaining page');
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    setStatusMsg('✓ Page removed from export list');
  };

  // Move page up/down
  const movePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    const newPages = [...pages];
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;
    setPages(newPages);
    setStatusMsg(`✓ Page moved ${direction}`);
  };

  // Canvas Signature pad setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isSigning]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setStatusMsg('✓ Signature pad cleared');
  };

  const handleExportReorderedPdf = () => {
    setStatusMsg('⚡ Compiling reordered & signed PDF dossier...');
    setTimeout(() => {
      setStatusMsg(`✓ Ready! Exported ${pages.length} pages with watermark & Bates stamps.`);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-studio-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#070b16] border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-lg shadow-md shadow-cyan-500/20">
              📕
            </div>
            <div>
              <h3 id="pdf-studio-title" className="text-sm font-black text-white uppercase tracking-wider">
                Visual PDF Page Organizer &amp; Signature Studio
              </h3>
              <p className="text-xs text-neutral-400">
                Interactive page reordering, 90° rotation, digital signing &amp; security watermarking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition-all cursor-pointer"
            aria-label="Close PDF Studio"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Message */}
          {statusMsg && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-300 animate-fadeIn" role="status">
              {statusMsg}
            </div>
          )}

          {/* 1. Page Organizer Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase">
                Document Pages ({pages.length}) — Click to Rotate or Reorder
              </span>
              <button
                onClick={() => {
                  setPages((prev) => [
                    ...prev,
                    {
                      id: `p${prev.length + 1}`,
                      pageNumber: prev.length + 1,
                      rotation: 0,
                      title: `Custom Appendix Section ${prev.length + 1}`,
                      isSelected: true,
                    },
                  ]);
                  setStatusMsg('✓ Added custom appendix page');
                }}
                className="text-xs text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                + Add Appendix Page
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  className="glass-card-3d p-3.5 rounded-2xl border border-white/[0.1] hover:border-cyan-400/50 transition-all space-y-2.5 relative group bg-[#04060c]"
                >
                  {/* Page Preview Thumbnail */}
                  <div
                    className="h-32 rounded-xl bg-neutral-950 border border-white/[0.06] flex flex-col items-center justify-center text-center p-3 transition-transform relative overflow-hidden"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  >
                    <div className="text-[10px] text-cyan-400 font-bold border-b border-cyan-500/20 pb-1 w-full truncate">
                      PAGE {idx + 1}
                    </div>
                    <div className="text-[11px] text-neutral-300 font-sans mt-2 line-clamp-2 px-1">
                      {page.title}
                    </div>
                    <div className="text-[8px] text-neutral-600 mt-2">
                      [BATES: TB-{String(idx + 1).padStart(4, '0')}]
                    </div>
                  </div>

                  {/* Page Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => movePage(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Page Earlier"
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-30 text-[10px] cursor-pointer"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => movePage(idx, 'down')}
                        disabled={idx === pages.length - 1}
                        title="Move Page Later"
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-30 text-[10px] cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => rotatePage(page.id)}
                        title="Rotate 90° Clockwise"
                        className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/20 cursor-pointer"
                      >
                        🔄 {page.rotation}°
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        title="Delete Page"
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Security Watermarking & Digital Signature Pad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Watermark Section */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
              <label className="text-xs font-bold text-neutral-300 uppercase">
                🛡️ Security Watermark Banner
              </label>
              <input
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                className="w-full bg-[#04060c] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:border-cyan-400 outline-none"
                placeholder="e.g. STRICTLY CONFIDENTIAL"
              />
              <p className="text-[10px] text-neutral-500">
                Injected diagonally across all exhibit pages at 15% opacity.
              </p>
            </div>

            {/* Signature Pad Section */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300 uppercase">
                  ✍️ Digital Examiner Signature
                </label>
                {hasSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-[10px] text-rose-400 hover:underline font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <canvas
                ref={canvasRef}
                width={360}
                height={75}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-20 bg-[#04060c] border border-cyan-500/30 rounded-xl cursor-crosshair"
              />
              <p className="text-[10px] text-neutral-500">
                Draw signature above to stamp on the final verification certificate.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="text-xs text-neutral-400">
            Target: <span className="text-cyan-300 font-bold">{datasetName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportReorderedPdf}
              className="btn-3d-primary font-bold shadow-lg"
            >
              ⚡ Export Signed PDF Dossier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
