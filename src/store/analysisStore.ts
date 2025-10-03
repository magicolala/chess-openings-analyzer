export type AnalysisMode = 'opponent' | 'self';

export type PlayerColor = 'white' | 'black';

export interface OpeningSelection {
  white: Set<string>;
  black: Set<string>;
}

export interface LichessQueueState {
  white: Set<string>;
  black: Set<string>;
}

export interface AnalysisConfig {
  ratingOffset: number;
  gmMode: 'top1' | 'topK' | 'coverage';
  gmTopK: number;
  gmCoverage: number;
  minMasterGames: number;
}

export interface PlayerPreparation {
  username: string;
  updatedAt: number;
  color: PlayerColor;
  openings: string[];
}

export interface AnalysisState {
  mode: AnalysisMode;
  latestPrep: PlayerPreparation | null;
  latestPlayer: string | null;
  speed: string;
  ratingBucket: number | null;
  config: AnalysisConfig;
  selectedOpenings: OpeningSelection;
  lichessLoading: boolean;
  pendingLichess: LichessQueueState;
  lichessCooldownUntil: number;
  lichessCooldownTimer: number | null;
}

export interface AnalysisStore {
  getState(): AnalysisState;
  subscribe(listener: (state: AnalysisState) => void): () => void;
  update(partial: Partial<AnalysisState> | ((state: AnalysisState) => Partial<AnalysisState>)): void;
  pushPending(color: PlayerColor, ecoCodes: Iterable<string>): void;
  clearPending(color: PlayerColor, ecoCodes?: Iterable<string>): void;
  toggleOpening(color: PlayerColor, ecoCode: string): void;
}

function createDefaultState(): AnalysisState {
  return {
    mode: 'opponent',
    latestPrep: null,
    latestPlayer: null,
    speed: 'blitz',
    ratingBucket: null,
    config: {
      ratingOffset: 0,
      gmMode: 'top1',
      gmTopK: 3,
      gmCoverage: 0.7,
      minMasterGames: 50,
    },
    selectedOpenings: {
      white: new Set<string>(),
      black: new Set<string>(),
    },
    lichessLoading: false,
    pendingLichess: {
      white: new Set<string>(),
      black: new Set<string>(),
    },
    lichessCooldownUntil: 0,
    lichessCooldownTimer: null,
  };
}

export function createAnalysisStore(initialState: Partial<AnalysisState> = {}): AnalysisStore {
  let state: AnalysisState = { ...createDefaultState(), ...initialState };
  const listeners = new Set<(value: AnalysisState) => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener(state);
    }
  };

  const updateState = (partial: Partial<AnalysisState>): void => {
    state = { ...state, ...partial };
    notify();
  };

  const store: AnalysisStore = {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(partial) {
      if (typeof partial === 'function') {
        updateState(partial(state));
      } else {
        updateState(partial);
      }
    },
    pushPending(color, ecoCodes) {
      const set = new Set(state.pendingLichess[color]);
      for (const code of ecoCodes) {
        set.add(code);
      }
      updateState({
        pendingLichess: {
          ...state.pendingLichess,
          [color]: set,
        },
      });
    },
    clearPending(color, ecoCodes) {
      if (ecoCodes) {
        const set = new Set(state.pendingLichess[color]);
        for (const code of ecoCodes) {
          set.delete(code);
        }
        updateState({
          pendingLichess: {
            ...state.pendingLichess,
            [color]: set,
          },
        });
        return;
      }
      updateState({
        pendingLichess: {
          ...state.pendingLichess,
          [color]: new Set<string>(),
        },
      });
    },
    toggleOpening(color, ecoCode) {
      const set = new Set(state.selectedOpenings[color]);
      if (set.has(ecoCode)) {
        set.delete(ecoCode);
      } else {
        set.add(ecoCode);
      }
      updateState({
        selectedOpenings: {
          ...state.selectedOpenings,
          [color]: set,
        },
      });
    },
  };

  return store;
}

export const analysisStore = createAnalysisStore();
