// Services d'accès à l'API publique Chess.com pour le mode Duel.

const BASE_URL = 'https://api.chess.com/pub/player';

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const message = `Requête Chess.com échouée (${response.status})`;
    throw new Error(message);
  }
  return response.json();
}

function sanitizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase();
}

/**
 * Récupère les métadonnées publiques d'un joueur Chess.com.
 * @param {string} username
 * @returns {Promise<any>}
 */
export async function fetchPlayerProfile(username) {
  const clean = sanitizeUsername(username);
  if (!clean) throw new Error("Pseudo Chess.com invalide");
  return fetchJson(`${BASE_URL}/${encodeURIComponent(clean)}`);
}

/**
 * Récupère la liste des archives mensuelles disponibles pour un joueur.
 * @param {string} username
 * @returns {Promise<string[]>}
 */
export async function fetchPlayerArchives(username) {
  const clean = sanitizeUsername(username);
  if (!clean) throw new Error("Pseudo Chess.com invalide");
  const data = await fetchJson(`${BASE_URL}/${encodeURIComponent(clean)}/games/archives`);
  return Array.isArray(data?.archives) ? data.archives : [];
}

/**
 * Récupère les parties les plus récentes d'un joueur.
 * @param {string} username
 * @param {number} [limit=10]
 * @returns {Promise<any[]>}
 */
export async function fetchLatestGames(username, limit = 10) {
  const archives = await fetchPlayerArchives(username);
  if (!archives.length) return [];
  const latest = archives[archives.length - 1];
  try {
    const data = await fetchJson(latest);
    const games = Array.isArray(data?.games) ? data.games : [];
    return games.slice(-Math.max(0, limit));
  } catch (error) {
    console.warn('Impossible de charger les parties Chess.com', error);
    return [];
  }
}
