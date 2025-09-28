// Adaptateurs de profil Chess.com pour le mode Duel.

function extractCountryCode(url) {
  if (typeof url !== 'string') return undefined;
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

/**
 * Convertit la réponse de l'API Chess.com en un profil simplifié.
 * @param {any} raw
 * @returns {import('./types.js').DuelPlayerProfile}
 */
export function adaptPlayerProfile(raw) {
  if (!raw) {
    return { username: '', name: undefined, avatar: undefined, country: undefined, joined: null, url: undefined };
  }
  return {
    username: raw.username || raw.player_id || '',
    name: raw.name || undefined,
    avatar: raw.avatar || undefined,
    country: extractCountryCode(raw.country),
    joined: raw.joined ? new Date(raw.joined * 1000) : null,
    url: raw.url || undefined,
  };
}
