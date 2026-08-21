'use client';

import React from 'react';
import { X, Download, ZoomIn, Eye } from 'lucide-react';
import { ScreenshotItem } from '@/types/scan';

interface ScreenshotModalProps {
  screenshot: ScreenshotItem | null;
  onClose: () => void;
}

export function ScreenshotModal({ screenshot, onClose }: ScreenshotModalProps) {
  if (!screenshot) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = screenshot.dataUrl;
    link.download = `webhealer-screenshot-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-white">{screenshot.title}</h3>
            {screenshot.suite && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                {screenshot.suite}
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono">[{screenshot.timestamp}]</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download Image</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Image */}
        <div className="p-4 bg-[#070b14] overflow-auto flex items-center justify-center min-h-[300px]">
          <img
            src={screenshot.dataUrl}
            alt={screenshot.title}
            className="max-h-[70vh] w-auto max-w-full rounded-lg border border-slate-800 object-contain shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
