import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Pattern } from '../types';
import { DOT_LABELS, calculateComplexity, getDotLabel } from '../utils';
import { 
  Trash2, Search, CheckCircle2, XCircle, ShieldAlert,
  MapPin, BarChart3, Clock, Layers, HelpCircle, ChevronDown, ChevronUp, Edit3, Check
} from 'lucide-react';

export const HistoryPanel = () => {
  const {
    patterns,
    removePattern,
    updatePatternStatus,
    updatePatternNote,
    selectedPatternId,
    setSelectedPatternId,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [showStats, setShowStats] = useState(true);

  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      if (searchFilter.trim() !== '') {
        const query = searchFilter.toLowerCase();
        const startLabel = getDotLabel(p.startingDot).toLowerCase();
        const startDir = p.startingDirection.toLowerCase();
        const sequenceStr = p.dotSequence.join('');
        const sequenceArrowStr = p.dotSequence.join('->');
        const customNote = p.note ? p.note.toLowerCase() : '';

        const matchesQuery = 
          startLabel.includes(query) ||
          startDir.includes(query) ||
          sequenceStr.includes(query) ||
          sequenceArrowStr.includes(query) ||
          customNote.includes(query) ||
          `sector (${p.gridTile.x},${p.gridTile.y})`.toLowerCase().includes(query) ||
          `grid ${p.gridTile.x}`.includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [patterns, searchFilter, statusFilter]);

  const stats = useMemo(() => {
    if (patterns.length === 0) return null;

    const total = patterns.length;
    const successful = patterns.filter(p => p.status === 'successful').length;
    const failed = patterns.filter(p => p.status === 'failed').length;
    const attempted = patterns.filter(p => p.status === 'attempted').length;

    const startDistribution: Record<number, number> = {};
    patterns.forEach(p => {
      startDistribution[p.startingDot] = (startDistribution[p.startingDot] || 0) + 1;
    });

    let topStartDot = -1;
    let maxStartCount = 0;
    Object.entries(startDistribution).forEach(([dot, count]) => {
      if (count > maxStartCount) {
        maxStartCount = count;
        topStartDot = Number(dot);
      }
    });

    const totalLength = patterns.reduce((sum, p) => sum + p.dotSequence.length, 0);
    const avgLength = totalLength / total;

    let maxComplexity = 0;
    patterns.forEach(p => {
      const comp = calculateComplexity(p.dotSequence).score;
      if (comp > maxComplexity) {
        maxComplexity = comp;
      }
    });

    return {
      total,
      successful,
      failed,
      attempted,
      successRate: Math.round((successful / total) * 100),
      avgLength: avgLength.toFixed(1),
      topStartLabel: topStartDot !== -1 ? DOT_LABELS[topStartDot] : 'None',
      topStartCount: maxStartCount,
      maxComplexity
    };
  }, [patterns]);

  const handleStartEdit = (p: Pattern) => {
    setEditingId(p.id);
    setEditNoteText(p.note || '');
  };

  const handleSaveEdit = (id: string) => {
    updatePatternNote(id, editNoteText);
    setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/90 border-l border-slate-800 backdrop-blur-md shadow-2xl overflow-hidden">
      
      <div className="p-4 border-b border-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">Pattern Index</h2>
        </div>
        <span className="text-[10px] font-mono py-0.5 px-2 bg-slate-800 text-slate-400 rounded-full">
          {patterns.length} Active
        </span>
      </div>

      {stats && (
        <div className="border-b border-slate-850">
          <button 
            onClick={() => setShowStats(!showStats)} 
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 transition-all font-medium"
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diagnostic Stats & Analytics</span>
            </div>
            {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showStats && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2 text-xs border-t border-slate-850/40 bg-slate-950/20">
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Success Rate</span>
                <span className="text-sm font-bold text-emerald-400">{stats.successRate}%</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  {stats.successful} of {stats.total} total
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Common Node</span>
                <span className="text-sm font-bold text-blue-400 truncate block" title={stats.topStartLabel}>
                  {stats.topStartLabel}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Start point count: {stats.topStartCount}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Avg Nodes Connect</span>
                <span className="text-sm font-bold text-indigo-400">{stats.avgLength} / 9</span>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/40">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Max Complexity</span>
                <span className="text-sm font-bold text-amber-500">{stats.maxComplexity} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 bg-slate-950/30 border-b border-slate-850 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search starting dot, notes, sector..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="absolute right-2.5 top-2 text-[10px] hover:text-white text-slate-500 cursor-pointer">
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {(['all', 'successful', 'failed', 'attempted'] as const).map((filter) => {
            const label = filter.charAt(0).toUpperCase() + filter.slice(1);
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`text-[10px] px-2.5 py-1.5 rounded-md transition-all font-medium ${
                  isActive 
                    ? filter === 'all' ? 'bg-slate-800 text-white' 
                      : filter === 'successful' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : filter === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredPatterns.length > 0 ? (
          filteredPatterns.map((p) => {
            const isSelected = p.id === selectedPatternId;
            const complexity = calculateComplexity(p.dotSequence);
            const formattedTime = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPatternId(p.id)}
                className={`group cursor-pointer rounded-xl border p-3 transition-all relative ${
                  isSelected
                    ? p.status === 'failed'
                      ? 'bg-slate-850/90 border-red-500 shadow-md shadow-red-500/10'
                      : p.status === 'successful'
                        ? 'bg-slate-850/90 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-850/90 border-blue-500/80 shadow-md shadow-blue-500/5'
                    : p.status === 'failed'
                      ? 'bg-red-950/20 border-red-900/50 hover:bg-red-950/30 hover:border-red-800'
                      : p.status === 'successful'
                        ? 'bg-emerald-950/15 border-emerald-900/30 hover:bg-emerald-950/25 hover:border-emerald-850'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850/40 hover:border-slate-700/60'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-200">
                        {getDotLabel(p.startingDot)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        complexity.label === 'Expert' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/40' :
                        complexity.label === 'Complex' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                        complexity.label === 'Moderate' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/40' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {complexity.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        ({p.gridTile.x}, {p.gridTile.y})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(p);
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                      title="Edit Label/Note"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePattern(p.id);
                      }}
                      className="p-1 hover:bg-red-950/40 rounded text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete Pattern"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center flex-wrap gap-1 bg-slate-950/40 p-1.5 rounded-lg border border-slate-850/60 font-mono text-[10px] text-slate-300">
                  {p.dotSequence.map((dot, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-600">→</span>}
                      <span className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-300 font-semibold border border-slate-800">
                        {dot}
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-850/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePatternStatus(p.id, 'successful');
                      }}
                      className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                        p.status === 'successful'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-950/20 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title="Mark as Successful Attempt"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePatternStatus(p.id, 'failed');
                      }}
                      className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                        p.status === 'failed'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-slate-950/20 text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title="Mark as Failed / Locked Out"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePatternStatus(p.id, 'attempted');
                      }}
                      className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                        p.status === 'attempted'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-950/20 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'
                      }`}
                      title="Reset to Attempted"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className={`text-[9px] font-mono uppercase tracking-wider py-0.5 px-1.5 rounded-full ${
                    p.status === 'successful' ? 'bg-emerald-950 text-emerald-400' :
                    p.status === 'failed' ? 'bg-red-950 text-red-400' :
                    'bg-blue-950 text-blue-400'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {editingId === p.id ? (
                  <div className="mt-2.5 p-2 bg-slate-950/80 rounded-lg border border-slate-850 flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      placeholder="Add custom label or metadata..."
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 rounded">
                        Cancel
                      </button>
                      <button onClick={() => handleSaveEdit(p.id)} className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-[10px] text-white rounded flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Save
                      </button>
                    </div>
                  </div>
                ) : p.note ? (
                  <div className="mt-2 text-[11px] text-slate-400 italic bg-slate-950/20 px-2 py-1.5 rounded-lg border border-slate-850/50">
                    "{p.note}"
                  </div>
                ) : null}

              </div>
            );
          })
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
            <HelpCircle className="w-7 h-7 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No recorded patterns</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Interact with any 3x3 dot lock grid on the infinite canvas to create logs.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
