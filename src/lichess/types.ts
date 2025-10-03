export type LichessSpeed = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

export interface ExplorerQuery {
  fen?: string;
  uciMoves?: string[];
  speeds?: LichessSpeed[];
  ratings?: number[];
  variant?: string;
}

export interface ExplorerOpening {
  eco: string;
  name: string;
}

export interface ExplorerMove {
  san: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
  gameCount?: number;
}

export interface ExplorerRecentGame {
  id: string;
  winner: 'white' | 'black' | null;
  speed: LichessSpeed;
  white: string;
  black: string;
  moves: string;
  opening?: ExplorerOpening;
}

export interface ExplorerResponse {
  opening?: ExplorerOpening;
  moves: ExplorerMove[];
  white: number;
  draws: number;
  black: number;
  recentGames?: ExplorerRecentGame[];
}

export interface MastersMove {
  san: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
}

export interface MastersResponse {
  opening?: ExplorerOpening;
  moves: MastersMove[];
  total: number;
}

export interface ScoredMove extends ExplorerMove {
  total: number;
  expectedScore: number;
  sideExpectedScore: number;
}

export interface GmMajorityEvaluation {
  considered: boolean;
  reason?: 'noData' | 'lowVolume';
  total?: number;
  coverage?: number;
  majoritySet?: Set<string>;
  pickedMoves?: Array<{ uci: string; san: string; volume: number; coverage: number }>;
  topMove?: { uci: string; san: string; volume: number; coverage: number } | null;
  inBook?: boolean | null;
}

export interface GmMajorityConfig {
  gmMode?: 'top1' | 'topK' | 'coverage';
  gmTopK?: number;
  coverageThreshold?: number;
  minMasterGames?: number;
}
