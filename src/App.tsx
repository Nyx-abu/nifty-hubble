import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BookOpen, CircleHelp, KeyRound, Moon, Sparkles, Sun } from 'lucide-react';
import type { PageName } from './types';
import { DrawPage } from './components/DrawPage';
import { useStore } from './store';
import './App.css';

const PredictionsPage = lazy(() => import('./components/PredictionsPage').then((module) => ({ default: module.PredictionsPage })));
const HistoryPage = lazy(() => import('./components/HistoryPage').then((module) => ({ default: module.HistoryPage })));

const pages: { id: PageName; label: string; short: string; icon: typeof KeyRound }[] = [
  { id: 'draw', label: 'Draw', short: 'Draw', icon: KeyRound },
  { id: 'predictions', label: 'Memory cues', short: 'Cues', icon: Sparkles },
  { id: 'history', label: 'History', short: 'History', icon: BookOpen },
];

function readTheme(): boolean {
  try {
    const saved = window.localStorage.getItem('pattern-notebook-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

function readPage(): PageName {
  const value = window.location.hash.replace('#', '');
  return value === 'predictions' || value === 'history' ? value : 'draw';
}

export default function App() {
  const [page, setPage] = useState<PageName>(readPage);
  const [pendingSequence, setPendingSequence] = useState<number[] | null>(null);
  const [dark, setDark] = useState(readTheme);
  const storageError = useStore((state) => state.storageError);
  const patterns = useStore((state) => state.patterns);

  useEffect(() => {
    const sync = () => setPage(readPage());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { window.localStorage.setItem('pattern-notebook-theme', dark ? 'dark' : 'light'); } catch { /* Theme stays in memory when storage is disabled. */ }
  }, [dark]);

  const navigate = useCallback((next: PageName) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const loadSequence = useCallback((sequence: number[]) => {
    setPendingSequence(sequence);
    navigate('draw');
  }, [navigate]);

  const clearPending = useCallback(() => setPendingSequence(null), []);
  const currentName = pages.find((item) => item.id === page)?.label ?? 'Draw';

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#draw" onClick={() => navigate('draw')} aria-label="Pattern notebook home">
          <span className="brand-mark"><KeyRound size={18} strokeWidth={2.2} /></span>
          <span><strong>Pattern</strong><small>NOTEBOOK</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {pages.map(({ id, label }) => <button type="button" className={page === id ? 'nav-link active' : 'nav-link'} key={id} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}>{label}{id === 'history' && patterns.length > 0 && <span className="nav-count">{patterns.length}</span>}</button>)}
        </nav>
        <div className="topbar-actions">
          <span className="page-indicator">{currentName}</span>
          <button type="button" className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} title={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        </div>
      </header>

      {storageError && <div className="storage-banner" role="status"><CircleHelp size={16} />{storageError}</div>}
      <main id="main-content" className="main-content">
        <Suspense fallback={<div className="page-loading" role="status">Opening your notebook…</div>}>
          {page === 'draw' && <DrawPage initialSequence={pendingSequence} onSequenceLoaded={clearPending} />}
          {page === 'predictions' && <PredictionsPage onTry={loadSequence} />}
          {page === 'history' && <HistoryPage onLoad={loadSequence} />}
        </Suspense>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        {pages.map(({ id, icon: Icon, short }) => <button type="button" className={page === id ? 'mobile-nav-link active' : 'mobile-nav-link'} key={id} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19} strokeWidth={page === id ? 2.2 : 1.8} /><span>{short}</span>{id === 'history' && patterns.length > 0 && <i>{patterns.length}</i>}</button>)}
      </nav>
      <footer className="site-footer"><span>Made for careful remembering.</span><span>Your notebook is stored locally on this device.</span></footer>
    </div>
  );
}
