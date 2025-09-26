import type { EngineConfig } from '../../infrastructure/engine/EngineManager';

export enum AnalysisMode {
  Opponent = 'opponent',
  Self = 'self',
}

export type SpeedCategory = 'bullet' | 'blitz' | 'rapid' | 'correspondence';

export interface AnalysisConfig {
  speedOverride: SpeedCategory | 'auto';
  ratingOffset: number;
  gmMode: 'disabled' | 'topK' | 'coverage';
  gmTopK: number;
  gmCoverage: number;
  minMasterGames: number;
  engine: EngineConfig;
}

export interface OpeningBucket {
  name: string;
  count: number;
  wins: number;
  draws: number;
  losses: number;
  traps: unknown[];
  games: unknown[];
  lichess?: unknown;
  gm?: unknown;
}

export interface PrepMetadata {
  ratingBucket: number | null;
  speed: SpeedCategory;
  engineConfig?: EngineConfig;
}

export interface LatestPreparation {
  mode: AnalysisMode;
  player: string;
  openings: {
    white: Record<string, OpeningBucket>;
    black: Record<string, OpeningBucket>;
  };
  metadata: PrepMetadata;
}

export interface AnalysisState {
  mode: AnalysisMode;
  latestPrep: LatestPreparation | null;
  latestPlayer: unknown;
  speed: SpeedCategory;
  ratingBucket: number | null;
  config: AnalysisConfig | null;
}

export const defaultAnalysisState: AnalysisState = {
  mode: AnalysisMode.Opponent,
  latestPrep: null,
  latestPlayer: null,
  speed: 'blitz',
  ratingBucket: null,
  config: null,
};
