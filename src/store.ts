import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './types';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      patterns: [],
      offset: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 }, // Initial center offset
      zoom: 1,
      gridLinesVisible: true,
      activeTile: null,
      selectedPatternId: null,
      searchFilter: '',
      statusFilter: 'all',

      addPattern: (pattern) => set((state) => ({
        patterns: [pattern, ...state.patterns],
        selectedPatternId: pattern.id, // Auto-select newly created pattern
      })),

      removePattern: (id) => set((state) => ({
        patterns: state.patterns.filter((p) => p.id !== id),
        selectedPatternId: state.selectedPatternId === id ? null : state.selectedPatternId,
      })),

      updatePatternStatus: (id, status) => set((state) => ({
        patterns: state.patterns.map((p) =>
          p.id === id ? { ...p, status } : p
        ),
      })),

      updatePatternNote: (id, note) => set((state) => ({
        patterns: state.patterns.map((p) =>
          p.id === id ? { ...p, note } : p
        ),
      })),

      setOffset: (offset) => set({ offset }),

      setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.15), 3.5) }),

      setGridLinesVisible: (gridLinesVisible) => set({ gridLinesVisible }),

      setSearchFilter: (searchFilter) => set({ searchFilter }),

      setStatusFilter: (statusFilter) => set({ statusFilter }),

      setSelectedPatternId: (selectedPatternId) => set({ selectedPatternId }),

      undoLastPattern: () => set((state) => {
        if (state.patterns.length === 0) return {};
        const [removed, ...remaining] = state.patterns;
        return {
          patterns: remaining,
          selectedPatternId: state.selectedPatternId === removed.id ? null : state.selectedPatternId,
        };
      }),

      resetCanvas: () => set({
        patterns: [],
        offset: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 },
        zoom: 1,
        selectedPatternId: null,
        activeTile: null,
      }),

      importPatterns: (imported) => set((state) => {
        // Simple validation to avoid corrupted items
        const valid = imported.filter(p => 
          p && 
          typeof p.id === 'string' &&
          p.gridTile && 
          typeof p.gridTile.x === 'number' &&
          typeof p.gridTile.y === 'number' &&
          Array.isArray(p.dotSequence)
        );
        
        // Prevent duplicate IDs by keeping existing ones if conflict
        const existingIds = new Set(state.patterns.map(p => p.id));
        const nonDuplicates = valid.filter(p => !existingIds.has(p.id));
        
        return {
          patterns: [...nonDuplicates, ...state.patterns],
        };
      }),
    }),
    {
      name: 'pattern-lock-tracker-state',
      partialize: (state) => ({
        patterns: state.patterns,
        gridLinesVisible: state.gridLinesVisible,
      }),
    }
  )
);
