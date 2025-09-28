// Typedefs et constantes partagées pour le mode Duel.

/**
 * @typedef {Object} DuelPlayerProfile
 * @property {string} username
 * @property {string} [name]
 * @property {string} [avatar]
 * @property {string} [country]
 * @property {Date|null} [joined]
 * @property {string} [url]
 */

/**
 * @typedef {Object} DuelOpeningStat
 * @property {string} line - Séquence d'ouverture normalisée (ex: "1.e4 e5").
 * @property {number} count - Nombre de parties observées.
 * @property {string} [firstPlayer] - Joueur à l'origine de la séquence.
 */

/**
 * @typedef {Object} DuelReport
 * @property {{ white: DuelPlayerProfile|null, black: DuelPlayerProfile|null }} players
 * @property {DuelOpeningStat[]} openings
 * @property {number} totalGames
 * @property {string|undefined} [error]
 */

/**
 * Nombre maximum de parties analysées par joueur pour le duel.
 * @type {number}
 */
export const DEFAULT_MAX_GAMES = 20;

/**
 * Valeur de repli pour un rapport de duel vide.
 * @returns {DuelReport}
 */
export function createEmptyDuelReport() {
  return {
    players: { white: null, black: null },
    openings: [],
    totalGames: 0,
    error: undefined,
  };
}
