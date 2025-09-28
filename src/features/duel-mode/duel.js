// Orchestrateur métier du mode Duel.

import { fetchLatestGames, fetchPlayerProfile } from './chesscom.js';
import { adaptPlayerProfile } from './profile.js';
import { buildOpeningTree } from './openingTree.js';
import { createEmptyDuelReport, DEFAULT_MAX_GAMES } from './types.js';

function safeUsername(username) {
  return String(username || '').trim();
}

/**
 * Prépare un duel entre deux joueurs Chess.com.
 * @param {{ white: string, black: string, maxGames?: number }} options
 * @returns {Promise<import('./types.js').DuelReport>}
 */
export async function loadDuelReport(options) {
  const whiteUsername = safeUsername(options?.white);
  const blackUsername = safeUsername(options?.black);
  if (!whiteUsername || !blackUsername) {
    throw new Error('Merci de renseigner deux pseudos Chess.com valides.');
  }

  const maxGames = Number.isFinite(options?.maxGames) ? Math.max(1, options.maxGames) : DEFAULT_MAX_GAMES;
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

/**
 * Fournit un rapport de duel prêt à l'emploi, même en cas d'échec partiel.
 * @param {{ white: string, black: string, maxGames?: number }} options
 * @returns {Promise<import('./types.js').DuelReport>}
 */
export async function loadDuelReportSafely(options) {
  try {
    return await loadDuelReport(options);
  } catch (error) {
    console.warn('Le mode Duel a rencontré une erreur', error);
    const fallback = createEmptyDuelReport();
    fallback.players.white = options?.white ? { username: safeUsername(options.white) } : null;
    fallback.players.black = options?.black ? { username: safeUsername(options.black) } : null;
    fallback.error = error instanceof Error ? error.message : String(error || 'Erreur inconnue');
    return fallback;
  }
}
