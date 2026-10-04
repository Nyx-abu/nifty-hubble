import { useMemo, useRef, useState } from 'react';
import { Check, Download, FileUp, Pencil, Play, Trash2, X } from 'lucide-react';
import type { PatternStatus } from '../types';
import { useStore } from '../store';
import { PatternPreview } from './PatternPreview';

const statusNames: Record<PatternStatus, string> = { attempted: 'Untested', failed: 'Failed', successful: 'Worked' };

export function HistoryPage({ onLoad }: { onLoad: (sequence: number[]) => void }) {
  const patterns = useStore((state) => state.patterns);
  const updateNote = useStore((state) => state.updatePatternNote);
  const removePattern = useStore((state) => state.removePattern);
  const importPatterns = useStore((state) => state.importPatterns);
  const savePattern = useStore((state) => state.savePattern);
  const correctLastOutcome = useStore((state) => state.correctLastOutcome);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<'all' | PatternStatus>('all');
  const [notice, setNotice] = useState('');
  const [noteEdit, setNoteEdit] = useState<{ id: string; value: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const visible = useMemo(() => patterns.filter((pattern) => filter === 'all' || pattern.status === filter), [patterns, filter]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(patterns, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pattern-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Pattern history exported.');
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      const result = importPatterns(data);
      setNotice(result.ok ? `Imported ${result.imported} pattern ${result.imported === 1 ? 'record' : 'records'}.` : result.message);
    } catch {
      setNotice('Import failed. Choose a valid JSON pattern history file.');
    }
  };

  return (
    <div className="page history-page">
      <div className="page-heading">
        <div><span className="eyebrow">Pattern notebook / 03</span><h1>Your history</h1><p>Patterns you saved, with their outcomes and retry counts.</p></div>
        <div className="history-tools">
          <button type="button" className="button button-outline" onClick={exportData}><Download size={16} />Export</button>
          <button type="button" className="button button-primary" onClick={() => fileRef.current?.click()}><FileUp size={16} />Import</button>
          <input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Choose pattern history file" onChange={(event) => { void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
        </div>
      </div>

      {notice && <div role="status" className="notice-line">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

      <div className="history-toolbar">
        <div className="history-count"><strong>{patterns.length}</strong> saved {patterns.length === 1 ? 'pattern' : 'patterns'}</div>
        <label className="select-wrap"><span className="visually-hidden">Filter by outcome</span><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All outcomes</option><option value="attempted">Untested</option><option value="failed">Failed</option><option value="successful">Worked</option></select></label>
      </div>

      {visible.length ? <div className="history-list">
        {visible.map((pattern) => <article className="history-card" key={pattern.id}>
          <div className="history-card-art"><PatternPreview sequence={pattern.dotSequence} label="Saved pattern" /></div>
          <div className="history-card-content">
            <div className="history-card-heading"><div><span className={`status-pill ${pattern.status}`}>{statusNames[pattern.status]}</span><span className="try-count">{pattern.attemptCount} {pattern.attemptCount === 1 ? 'try' : 'tries'}</span></div><time dateTime={new Date(pattern.timestamp).toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(pattern.timestamp)}</time></div>
            <div className="sequence-notation">{pattern.dotSequence.map((dot, index) => <span key={`${dot}-${index}`}>{index > 0 && <b>→</b>}{dot + 1}</span>)}</div>
            {noteEdit?.id === pattern.id ? <form className="note-editor" onSubmit={(event) => { event.preventDefault(); updateNote(pattern.id, noteEdit.value.trim()); setNoteEdit(null); }}><label htmlFor={`note-${pattern.id}`}>Pattern note</label><input id={`note-${pattern.id}`} value={noteEdit.value} maxLength={240} onChange={(event) => setNoteEdit({ id: pattern.id, value: event.target.value })} placeholder="A clue to help you remember" /><button className="button button-primary compact" type="submit"><Check size={15} />Save note</button><button className="button button-quiet compact" type="button" onClick={() => setNoteEdit(null)}>Cancel</button></form> : <div className="note-row"><span>{pattern.note || 'Add a memory cue…'}</span><button type="button" className="icon-button" aria-label={`${pattern.note ? 'Edit' : 'Add'} note`} onClick={() => setNoteEdit({ id: pattern.id, value: pattern.note ?? '' })}><Pencil size={15} /></button></div>}
            {pattern.outcomes.length > 0 && <div className="outcome-log">Recent outcomes: {pattern.outcomes.slice(-5).map((outcome, index) => <span className={outcome} key={`${outcome}-${index}`}>{outcome === 'successful' ? 'worked' : 'failed'}</span>)}</div>}
            <div className="history-card-actions"><button type="button" className="button button-outline compact" onClick={() => onLoad(pattern.dotSequence)}><Play size={14} />Load in grid</button><div className="outcome-edit"><span>{pattern.outcomes.length ? 'Correct latest' : 'Record result'}</span><button type="button" className="mini-outcome failed" aria-label={pattern.outcomes.length ? 'Correct latest outcome to failed' : 'Record a failed attempt'} title={pattern.outcomes.length ? 'Correct latest result to failed' : 'Record failure'} onClick={() => pattern.outcomes.length ? correctLastOutcome(pattern.id, 'failed') : savePattern(pattern.dotSequence, 'failed')}><X size={15} /></button><button type="button" className="mini-outcome successful" aria-label={pattern.outcomes.length ? 'Correct latest outcome to worked' : 'Record a successful attempt'} title={pattern.outcomes.length ? 'Correct latest result to worked' : 'Record worked'} onClick={() => pattern.outcomes.length ? correctLastOutcome(pattern.id, 'successful') : savePattern(pattern.dotSequence, 'successful')}><Check size={15} /></button></div>
              {deleteId === pattern.id ? <div className="delete-confirm" role="group" aria-label="Confirm pattern deletion"><span>Delete this record?</span><button type="button" className="button button-danger compact" onClick={() => { removePattern(pattern.id); setDeleteId(null); }}>Delete</button><button type="button" className="button button-quiet compact" onClick={() => setDeleteId(null)}>Keep</button></div> : <button type="button" className="icon-button delete-button" aria-label="Delete pattern record" onClick={() => setDeleteId(pattern.id)}><Trash2 size={16} /></button>}
            </div>
          </div>
        </article>)}
      </div> : <div className="empty-state"><span className="empty-grid">···<br />···<br />···</span><strong>{patterns.length ? 'No patterns match this filter' : 'Your pattern history starts here'}</strong><p>{patterns.length ? 'Choose another outcome above to see your saved patterns.' : 'Draw a pattern and record an outcome, or save it as untested.'}</p></div>}
    </div>
  );
}
