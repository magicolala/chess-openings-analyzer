import { fetchLatestGames, fetchPlayerProfile } from './chesscom';
import { adaptPlayerProfile } from './profile';
import { buildOpeningTree } from './openingTree';
import { createEmptyDuelReport, DEFAULT_MAX_GAMES, DuelReport } from './types';

export interface DuelOptions {
  white: string;
  black: string;
  maxGames?: number;
}

function safeUsername(username: string | null | undefined): string {
  return String(username ?? '').trim();
}

export async function loadDuelReport(options: DuelOptions): Promise<DuelReport> {
  const whiteUsername = safeUsername(options?.white);
  const blackUsername = safeUsername(options?.black);
  if (!whiteUsername || !blackUsername) {
    throw new Error('Merci de renseigner deux pseudos Chess.com valides.');
  }

  const maxGames = Number.isFinite(options?.maxGames) ? Math.max(1, options.maxGames ?? DEFAULT_MAX_GAMES) : DEFAULT_MAX_GAMES;
  const [whiteProfileRaw, blackProfileRaw] = await Promise.all([
    fetchPlayerProfile(whiteUsername),
    fetchPlayerProfile(blackUsername),
  ]);

  const [whiteGames, blackGames] = await Promise.all([
    fetchLatestGames(whiteUsername, maxGames),
    fetchLatestGames(blackUsername, maxGames),
  ]);

  const openings = buildOpeningTree([...whiteGames, ...blackGames]);

  return {
    players: {
      white: adaptPlayerProfile(whiteProfileRaw),
      black: adaptPlayerProfile(blackProfileRaw),
    },
    openings,
    totalGames: openings.reduce((total, entry) => total + entry.count, 0),
    error: undefined,
  };
}

export async function loadDuelReportSafely(options: DuelOptions): Promise<DuelReport> {
  try {
    return await loadDuelReport(options);
  } catch (error) {
    console.warn('Le mode Duel a rencontré une erreur', error);
    const fallback = createEmptyDuelReport();
    fallback.players.white = options?.white ? { username: safeUsername(options.white) } : null;
    fallback.players.black = options?.black ? { username: safeUsername(options.black) } : null;
    fallback.error = error instanceof Error ? error.message : String(error ?? 'Erreur inconnue');
    return fallback;
  }
}
