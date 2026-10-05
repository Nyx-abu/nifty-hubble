import { create } from 'zustand';
import { mergePatterns, parseImportRecords, parsePattern } from './domain/history';
import { patternKey } from './domain/patterns';
import type { AppState, Pattern } from './types';

const STORAGE_KEY = 'pattern-lock-tracker-state';
const asRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function readSavedState(): { patterns: Pattern[]; error: string | null; mayWrite: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { patterns: [], error: null, mayWrite: true };
    const parsed: unknown = JSON.parse(raw);
    const envelope = asRecord(parsed);
    const state = asRecord(envelope?.state);
    const list = Array.isArray(parsed) ? parsed : state?.patterns;
    if (!Array.isArray(list)) return { patterns: [], error: 'Saved history could not be read. Import a valid history file before changing stored patterns.', mayWrite: false };
    const patterns = list.map(parsePattern);
    if (patterns.some((pattern) => pattern === null)) return { patterns: [], error: 'Some saved history is damaged. Import a valid history file before changing stored patterns.', mayWrite: false };
    return { patterns: mergePatterns(patterns as Pattern[], []), error: null, mayWrite: true };
  } catch {
    return { patterns: [], error: 'Browser storage could not be read. Import a valid history file before changing stored patterns.', mayWrite: false };
  }
}

const initial = typeof window === 'undefined' ? { patterns: [] as Pattern[], error: null, mayWrite: true } : readSavedState();
let persistenceAllowed = initial.mayWrite;
let lastPersistedPatterns = initial.patterns;

export const useStore = create<AppState>((set, get) => ({
  patterns: initial.patterns,
  storageError: initial.error,
  savePattern: (dotSequence, outcome) => {
    const key = patternKey(dotSequence);
    const existing = get().patterns.find((pattern) => patternKey(pattern.dotSequence) === key);
    const now = Date.now();
    if (existing) {
      if (!outcome) return existing.id;
      set((state) => ({ patterns: state.patterns.map((pattern) => pattern.id === existing.id ? {
        ...pattern,
        status: outcome,
        attemptCount: pattern.attemptCount + 1,
        lastAttemptAt: now,
        outcomes: [...pattern.outcomes, outcome],
      } : pattern) }));
      return existing.id;
    }
    const pattern: Pattern = {
      id: globalThis.crypto?.randomUUID?.() ?? `pattern-${now}-${Math.random().toString(36).slice(2)}`,
      dotSequence: [...dotSequence],
      status: outcome ?? 'attempted',
      timestamp: now,
      attemptCount: outcome ? 1 : 0,
      ...(outcome ? { lastAttemptAt: now, outcomes: [outcome] } : { outcomes: [] }),
    };
    set((state) => ({ patterns: [pattern, ...state.patterns] }));
    return pattern.id;
  },
  correctLastOutcome: (id, outcome) => set((state) => ({ patterns: state.patterns.map((pattern) => {
    if (pattern.id !== id || pattern.outcomes.length === 0) return pattern;
    const outcomes = [...pattern.outcomes];
    outcomes[outcomes.length - 1] = outcome;
    return { ...pattern, status: outcome, outcomes };
  }) })),
  updatePatternNote: (id, note) => set((state) => ({ patterns: state.patterns.map((pattern) => pattern.id === id ? { ...pattern, note } : pattern) })),
  removePattern: (id) => set((state) => ({ patterns: state.patterns.filter((pattern) => pattern.id !== id) })),
  clearPatterns: () => { persistenceAllowed = true; set({ patterns: [], storageError: null }); },
  clearStorageError: () => set({ storageError: null }),
  importPatterns: (value) => {
    const payload = asRecord(value);
    const list = Array.isArray(value) ? value : asRecord(payload?.state)?.patterns;
    if (!Array.isArray(list)) return { ok: false, message: 'This file does not contain a pattern list.' };
    const { patterns: parsed, skipped } = parseImportRecords(list);
    if (parsed.length === 0) return { ok: false, message: 'Import stopped: no valid pattern records were found. Every record needs a stable ID, unique dot indexes from 0 to 8, and valid saved metadata.' };
    let merged: Pattern[];
    try {
      merged = mergePatterns(parsed, get().patterns);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Import stopped: incompatible record IDs.' };
    }
    persistenceAllowed = true;
    set({ patterns: merged, storageError: null });
    return { ok: true, imported: parsed.length, skipped };
  },
}));

useStore.subscribe((state) => {
  if (state.patterns === lastPersistedPatterns) return;
  lastPersistedPatterns = state.patterns;
  if (!persistenceAllowed) {
    useStore.setState({ storageError: initial.error ?? 'Saved history is protected until you import a valid history file.' });
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { patterns: state.patterns }, version: 1 }));
    if (state.storageError) useStore.setState({ storageError: null });
  } catch {
    persistenceAllowed = false;
    useStore.setState({ storageError: 'Browser storage is unavailable. Your patterns will remain only until this page closes.' });
  }
});
