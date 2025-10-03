export interface DuelPlayerProfile {
  username: string;
  name?: string;
  avatar?: string;
  country?: string;
  joined?: Date | null;
  url?: string;
}

export interface DuelOpeningStat {
  line: string;
  count: number;
  firstPlayer?: string;
}

export interface DuelReport {
  players: {
    white: DuelPlayerProfile | null;
    black: DuelPlayerProfile | null;
  };
  openings: DuelOpeningStat[];
  totalGames: number;
  error?: string;
}

export const DEFAULT_MAX_GAMES = 20;

export function createEmptyDuelReport(): DuelReport {
  return {
    players: { white: null, black: null },
    openings: [],
    totalGames: 0,
    error: undefined,
  };
}
