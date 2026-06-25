/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PatternCanvas } from './components/PatternCanvas';
import { HistoryPanel } from './components/HistoryPanel';
import { ControlOverlay } from './components/ControlOverlay';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useStore } from './store';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { patterns } = useStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-row font-sans text-slate-100 antialiased">
      
      {/* Left/Main interactive infinite canvas area */}
      <div className="relative flex-1 h-full flex flex-col overflow-hidden min-w-0">
        
        {/* Floating brand and action controls */}
        <ControlOverlay />
        
        {/* Main Canvas rendering engine */}
        <PatternCanvas />

        {/* Floating Sidebar toggle button */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur border shadow-xl transition-all duration-300 ${
              sidebarOpen
                ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-blue-500/15'
            }`}
            title={sidebarOpen ? "Hide History & Statistics" : "Show History & Statistics"}
          >
            {sidebarOpen ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                <span className="hidden sm:inline">Close Panel</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                <span className="hidden sm:inline">History & Stats ({patterns.length})</span>
                <span className="sm:hidden">{patterns.length}</span>
              </>
            )}
          </button>
        </div>

        {/* Desktop-only subtle hints footer */}
        <div className="absolute bottom-4 left-44 hidden md:block text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono pointer-events-none select-none">
          Click+Drag canvas to navigate • Click+Drag dot vertex to draw paths
        </div>
      </div>

      {/* Right Collapsible Panel (History logs & Analytical graphics) */}
      <div 
        className={`h-full border-l border-slate-900 transition-all duration-300 ease-in-out shrink-0 relative z-10 ${
          sidebarOpen ? 'w-80 md:w-96 opacity-100' : 'w-0 opacity-0 overflow-hidden border-l-0'
        }`}
      >
        <div className="w-80 md:w-96 h-full">
          <HistoryPanel />
        </div>
      </div>

    </div>
  );
}
