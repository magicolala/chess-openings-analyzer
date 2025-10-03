const BASE_URL = 'https://api.chess.com/pub/player';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Requête Chess.com échouée (${response.status})`);
  }
  return (await response.json()) as T;
}

function sanitizeUsername(username: string | null | undefined): string {
  return String(username ?? '').trim().toLowerCase();
}

export async function fetchPlayerProfile(username: string): Promise<Record<string, unknown>> {
  const clean = sanitizeUsername(username);
  if (!clean) {
    throw new Error('Pseudo Chess.com invalide');
  }
  return fetchJson<Record<string, unknown>>(`${BASE_URL}/${encodeURIComponent(clean)}`);
}

export async function fetchPlayerArchives(username: string): Promise<string[]> {
  const clean = sanitizeUsername(username);
  if (!clean) {
    throw new Error('Pseudo Chess.com invalide');
  }
  const data = await fetchJson<{ archives?: string[] }>(`${BASE_URL}/${encodeURIComponent(clean)}/games/archives`);
  return Array.isArray(data?.archives) ? data.archives : [];
}

export interface ChessComGame {
  pgn?: string;
  white?: { username?: string };
  black?: { username?: string };
}

export async function fetchLatestGames(username: string, limit = 10): Promise<ChessComGame[]> {
  const archives = await fetchPlayerArchives(username);
  if (!archives.length) {
    return [];
  }
  const latest = archives[archives.length - 1];
  try {
    const data = await fetchJson<{ games?: ChessComGame[] }>(latest);
    const games = Array.isArray(data?.games) ? data.games : [];
    return games.slice(-Math.max(0, limit));
  } catch (error) {
    console.warn('Impossible de charger les parties Chess.com', error);
    return [];
  }
}
