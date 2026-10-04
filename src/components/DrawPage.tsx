import { useEffect, useMemo, useState } from 'react';
import { Check, CircleHelp, RotateCcw, Save, X } from 'lucide-react';
import { isValidPattern, patternKey } from '../domain/patterns';
import { PatternGrid } from './PatternGrid';
import { PatternPreview } from './PatternPreview';
import { useStore } from '../store';

export function DrawPage({ initialSequence, onSequenceLoaded }: { initialSequence: number[] | null; onSequenceLoaded: () => void }) {
  const patterns = useStore((state) => state.patterns);
  const savePattern = useStore((state) => state.savePattern);
  const [sequence, setSequence] = useState<number[]>([]);
  const [savedMessage, setSavedMessage] = useState('');
  const [inputMode, setInputMode] = useState<'draw' | 'tap'>('draw');

  useEffect(() => {
    if (initialSequence) {
      setSequence(initialSequence);
      onSequenceLoaded();
    }
  }, [initialSequence, onSequenceLoaded]);

  const duplicate = useMemo(() => {
    if (!sequence.length) return undefined;
    const key = patternKey(sequence);
    return patterns.find((pattern) => patternKey(pattern.dotSequence) === key);
  }, [patterns, sequence]);
  const valid = isValidPattern(sequence);

  const record = (outcome?: 'failed' | 'successful') => {
    if (!valid) return;
    savePattern(sequence, outcome);
    setSavedMessage(outcome === 'failed' ? 'Failure recorded. The retry count is updated.' : outcome === 'successful' ? 'Worked recorded. The retry count is updated.' : 'Saved as untested.');
  };

  return (
    <div className="page draw-page">
      <div className="page-heading">
        <div><span className="eyebrow">Pattern notebook / 01</span><h1>Draw a pattern</h1><p>One grid, one sequence. Drag through the dots or tap them in order.</p></div>
        <div className="saved-count"><span>{patterns.length}</span><small>saved patterns</small></div>
      </div>
      <div className="draw-layout">
        <section className="drawing-card" aria-label="Draw an Android pattern">
          <div className="phone-topline"><span className="phone-speaker" /><span className="phone-camera" /></div>
          <div className="phone-instruction">Draw your screen lock</div>
          <div className="input-mode" role="group" aria-label="Choose pattern input method">
            <button type="button" className={inputMode === 'draw' ? 'active' : ''} aria-pressed={inputMode === 'draw'} onClick={() => setInputMode('draw')}>Drag path</button>
            <button type="button" className={inputMode === 'tap' ? 'active' : ''} aria-pressed={inputMode === 'tap'} onClick={() => setInputMode('tap')}>Tap dots</button>
          </div>
          <PatternGrid mode={inputMode} sequence={sequence} onChange={(next) => { setSequence(next); setSavedMessage(''); }} />
          <div className="phone-caption">3 × 3 screen pattern</div>
        </section>

        <section className="draw-details">
          <div className={`status-card${duplicate ? ' is-known' : valid ? ' is-new' : ''}`} aria-live="polite">
            <div className="status-mark">{duplicate ? <Check size={18} /> : valid ? <span className="new-dot" /> : <span className="waiting-dot" />}</div>
            <div>
              <strong>{duplicate ? (duplicate.status === 'attempted' ? 'Saved · untested' : 'Already tried') : valid ? 'New pattern' : 'Ready when you are'}</strong>
              <p>{duplicate ? duplicate.status === 'attempted' ? 'This exact sequence is saved, but no outcome has been recorded.' : `Last outcome: ${duplicate.status === 'successful' ? 'worked' : 'failed'} · ${duplicate.attemptCount} ${duplicate.attemptCount === 1 ? 'try' : 'tries'}` : valid ? 'This sequence is not in your saved pattern history.' : 'Patterns need at least four different dots.'}</p>
            </div>
          </div>

          <div className="sequence-card">
            <div className="section-kicker">Your sequence <span>{sequence.length}/9 dots</span></div>
            {sequence.length > 0 ? <PatternPreview sequence={sequence} className="sequence-preview" /> : <div className="empty-preview">Your traced shape will appear here</div>}
            {savedMessage && <p className="inline-feedback" role="status">{savedMessage}</p>}
            {duplicate?.note && <p className="known-note">“{duplicate.note}”</p>}
            <div className="draw-actions">
              <button className="button button-quiet" type="button" onClick={() => { setSequence((current) => current.slice(0, -1)); setSavedMessage(''); }} disabled={!sequence.length} aria-label="Undo last dot"><RotateCcw size={16} />Undo</button>
              <button className="button button-quiet" type="button" onClick={() => { setSequence([]); setSavedMessage(''); }} disabled={!sequence.length}>Clear</button>
            </div>
          </div>

          <div className="outcome-card">
            <div className="section-kicker">What happened when you tried it?</div>
            <p>Your drawing only becomes a saved record when you choose an outcome.</p>
            <div className="outcome-actions">
              <button className="button button-failure" type="button" disabled={!valid} onClick={() => record('failed')}><X size={16} />Failed</button>
              <button className="button button-success" type="button" disabled={!valid} onClick={() => record('successful')}><Check size={16} />Worked</button>
              <button className="button button-outline" type="button" disabled={!valid || Boolean(duplicate)} onClick={() => record()}><Save size={16} />Save untested</button>
            </div>
            <div className="private-note"><CircleHelp size={15} /><span>Patterns stay in this browser. They are never sent to a server.</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
