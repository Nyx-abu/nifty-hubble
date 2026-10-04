import { useMemo, useState } from 'react';
import { ArrowUpRight, Dices, RefreshCw, Sparkles } from 'lucide-react';
import { generatePredictions, type PredictionCandidate, type PredictionFamily } from '../domain/patterns';
import { useStore } from '../store';
import { PatternPreview } from './PatternPreview';

const families: { value: PredictionFamily | 'all'; label: string }[] = [
  { value: 'all', label: 'All shapes' }, { value: 'letters', label: 'Letters' }, { value: 'numbers', label: 'Numbers' }, { value: 'shapes', label: 'Shapes' },
];

export function PredictionsPage({ onTry }: { onTry: (sequence: number[]) => void }) {
  const patterns = useStore((state) => state.patterns);
  const [learnFromHistory, setLearnFromHistory] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [family, setFamily] = useState<PredictionFamily | 'all'>('all');
  const [seed, setSeed] = useState(() => Date.now());
  const candidates = useMemo(() => generatePredictions(patterns, { count: 18, seed, learnFromHistory, includeFailed, family }), [patterns, seed, learnFromHistory, includeFailed, family]);

  return (
    <div className="page predictions-page">
      <div className="page-heading">
        <div><span className="eyebrow">Pattern notebook / 02</span><h1>Memory cues</h1><p>Explore familiar shapes that may help a forgotten pattern come back to mind.</p></div>
        <button className="button button-primary regenerate" type="button" onClick={() => setSeed((value) => value + 1)}><RefreshCw size={16} />Generate another set</button>
      </div>

      <section className="predictor-intro">
        <div className="predictor-icon"><Sparkles size={19} /></div>
        <div><strong>Locally generated memory cues</strong><p>These are qualitative prompts based on common letter, number, and geometric shapes. A <a href="https://arxiv.org/abs/1811.10548" target="_blank" rel="noreferrer">survey of Android pattern research</a> reports common start areas, path lengths, and motifs. The extra letter and number templates are familiar shape prompts, not measured frequency rankings. Suggestions are not probabilities and cannot verify a phone lock.</p></div>
      </section>

      <section className="predictor-controls" aria-label="Prediction options">
        <div className="family-filter" role="group" aria-label="Filter shape family">
          {families.map((item) => <button type="button" key={item.value} className={family === item.value ? 'filter-chip active' : 'filter-chip'} aria-pressed={family === item.value} onClick={() => setFamily(item.value)}>{item.label}</button>)}
        </div>
        <label className="toggle-row"><span><strong>Learn from saved patterns</strong><small>Use your saved sequence shapes as memory cues</small></span><input type="checkbox" checked={learnFromHistory} onChange={(event) => setLearnFromHistory(event.target.checked)} /><i aria-hidden="true" /></label>
        <label className="toggle-row"><span><strong>Include failed retries</strong><small>Show previously failed patterns again</small></span><input type="checkbox" checked={includeFailed} onChange={(event) => setIncludeFailed(event.target.checked)} /><i aria-hidden="true" /></label>
      </section>

      <div className="gallery-heading"><div><span className="eyebrow">Suggested shapes</span><h2>{candidates.length ? `${candidates.length} patterns to explore` : 'No suggestions for this filter'}</h2></div><span className="gallery-note"><Dices size={15} /> A fresh set is made in this browser</span></div>
      {candidates.length ? <div className="prediction-gallery">
        {candidates.map((candidate: PredictionCandidate) => <article className="prediction-card" key={candidate.key}>
          <div className="prediction-card-top"><span className={`family-tag ${candidate.family}`}>{candidate.family}</span>{candidate.previouslyTried && <span className="tried-tag">Failed · retry</span>}</div>
          <PatternPreview sequence={candidate.dotSequence} label={`${candidate.label} cue`} className="prediction-preview" />
          <h3>{candidate.label}</h3>
          <p>{candidate.reason}</p>
          <button className="button button-outline try-button" type="button" onClick={() => onTry(candidate.dotSequence)}>Try this shape <ArrowUpRight size={16} /></button>
        </article>)}
      </div> : <div className="empty-state"><Sparkles size={23} /><strong>No shapes in this view yet</strong><p>Choose another family or adjust the history options to make a new set.</p></div>}
    </div>
  );
}
