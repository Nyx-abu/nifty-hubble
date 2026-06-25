/**
 * Types and interfaces for the Pattern Lock Tracker.
 */

export interface GridTile {
  x: number;
  y: number;
}

export type PatternStatus = 'attempted' | 'successful' | 'failed';

export interface Pattern {
  id: string;
  gridTile: GridTile;
  dotSequence: number[]; // Array of indices (0-8) in reading order (0: top-left, 8: bottom-right)
  startingDot: number;   // Index of the starting dot (0-8)
  startingDirection: string; // "top-left", "center", "bottom-right", etc.
  timestamp: number;
  status: PatternStatus;
  note?: string;         // Custom optional label or note for this pattern
}

export interface AppState {
  patterns: Pattern[];
  offset: { x: number; y: number };
  zoom: number;
  gridLinesVisible: boolean;
  activeTile: GridTile | null;
  selectedPatternId: string | null;
  searchFilter: string;
  statusFilter: 'all' | PatternStatus;
  
  // Actions
  addPattern: (pattern: Pattern) => void;
  removePattern: (id: string) => void;
  updatePatternStatus: (id: string, status: PatternStatus) => void;
  updatePatternNote: (id: string, note: string) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setGridLinesVisible: (visible: boolean) => void;
  setSearchFilter: (filter: string) => void;
  setStatusFilter: (filter: 'all' | PatternStatus) => void;
  setSelectedPatternId: (id: string | null) => void;
  undoLastPattern: () => void;
  resetCanvas: () => void;
  importPatterns: (patterns: Pattern[]) => void;
}
