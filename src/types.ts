export type PatternStatus = 'attempted' | 'successful' | 'failed';
export type PatternOutcome = Exclude<PatternStatus, 'attempted'>;
export type ImportResult = { ok: true; imported: number; skipped: number } | { ok: false; message: string };

/** A saved 3×3 sequence. `gridTile` remains optional for legacy imports. */
export interface Pattern {
  id: string;
  dotSequence: number[];
  status: PatternStatus;
  timestamp: number;
  note?: string;
  gridTile?: { x: number; y: number };
  startingDot?: number;
  startingDirection?: string;
  attemptCount: number;
  lastAttemptAt?: number;
  outcomes: PatternOutcome[];
  mergedIds?: string[];
}

export type PageName = 'draw' | 'predictions' | 'history';

export interface AppState {
  patterns: Pattern[];
  storageError: string | null;
  savePattern: (dotSequence: number[], outcome?: PatternOutcome) => string;
  correctLastOutcome: (id: string, outcome: PatternOutcome) => void;
  updatePatternNote: (id: string, note: string) => void;
  removePattern: (id: string) => void;
  importPatterns: (value: unknown) => ImportResult;
  clearPatterns: () => void;
  clearStorageError: () => void;
}
