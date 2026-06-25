import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { triggerDownloadJSON } from '../utils';
import { 
  RotateCcw, Undo2, Download, Upload, AlertCircle, 
  KeyRound, Info, Check, HelpCircle, X
} from 'lucide-react';

export const ControlOverlay = () => {
  const { patterns, undoLastPattern, resetCanvas, importPatterns } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    if (patterns.length === 0) {
      alert("No patterns logged to export! Draw a few patterns on any grid tile first.");
      return;
    }
    triggerDownloadJSON(patterns);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          importPatterns(parsed);
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 3000);
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      } catch (err) {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input element
  };

  const handleResetConfirm = () => {
    resetCanvas();
    setShowResetConfirm(false);
  };

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 max-w-sm pointer-events-auto">
      
      {/* Brand card */}
      <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/30">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
              Pattern Lock Tracker
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Infinite Procedural Grid Canvas</p>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-1.5 mt-4 pt-3.5 border-t border-slate-850">
          <button
            onClick={undoLastPattern}
            disabled={patterns.length === 0}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-750/50"
            title="Undo last recorded pattern attempt"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-800"
            title="Export pattern library as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-800"
            title="Import patterns from saved JSON file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1.5 bg-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition"
            title="Application Info & Guide"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Hidden Import file picker input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Dynamic Reset controls inside Brand card */}
        <div className="mt-2.5 flex items-center justify-between">
          <button
            onClick={() => setShowResetConfirm(!showResetConfirm)}
            className="text-[10px] text-red-500 hover:text-red-400 hover:underline flex items-center gap-1 font-mono transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Format Database</span>
          </button>

          {importStatus === 'success' && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-3 h-3" /> Imported Logs
            </span>
          )}
          {importStatus === 'error' && (
            <span className="text-[10px] text-red-400 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3 h-3" /> Parse Error
            </span>
          )}
        </div>
      </div>

      {/* Inline Reset Warning Confirmation */}
      {showResetConfirm && (
        <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg backdrop-blur shadow-2xl flex flex-col gap-2.5 animate-fadeIn">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-200 leading-relaxed font-medium">
              Are you sure you want to erase all logged pattern locks? This operation is permanent and wipes all history.
            </p>
          </div>
          <div className="flex justify-end gap-1.5 self-end">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="text-[10px] px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded font-medium border border-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleResetConfirm}
              className="text-[10px] px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded shadow-lg shadow-red-600/20 transition-all"
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Info Guide Popup modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full animate-scaleUp">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-slate-100 text-base">Canvas Map & Control Guide</h3>
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                Welcome to the <strong>Pattern Lock Tracker</strong>! This app provides an infinite, tile-based 2D grid space to sketch, test, and analyze standard 3x3 pattern unlock schemes.
              </p>

              <div>
                <h4 className="font-semibold text-slate-200 mb-1 font-mono uppercase text-[10px] tracking-wider text-blue-400">Navigation Controls</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Pan/Scroll</strong>: Left-click and drag in any empty area, or use standard touchscreen dragging to traverse sectors.</li>
                  <li><strong>Zoom Scale</strong>: Use your mouse scroll-wheel or double-touch pincers to focus on micro sector grids.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-1 font-mono uppercase text-[10px] tracking-wider text-blue-400">Drawing Mechanics</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Click and hold your mouse or pointer on any dot vertex, then drag across nearby grid coordinates to connect path locks.</li>
                  <li>Releasing your touch finalized the sequence list automatically.</li>
                  <li>Each grid tile sector contains custom, procedurally generated color palettes based on location coordinates.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-1 font-mono uppercase text-[10px] tracking-wider text-blue-400">Statistics & Diagnostics</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Analyze sequence indices, node totals, and complexity ratings of each sketch.</li>
                  <li>Toggle mark status buttons to track success/failure lock attempts.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition shadow-lg shadow-blue-600/20"
            >
              Understand & Continue
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
