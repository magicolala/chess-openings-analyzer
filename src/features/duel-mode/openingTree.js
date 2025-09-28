// Construction légère de statistiques d'ouverture pour le mode Duel.

function extractMovesFromPgn(pgn) {
  if (typeof pgn !== 'string') return [];
  const parts = pgn.split(/\n\n/);
  const movesSection = parts[parts.length - 1] || '';
  return movesSection
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function summariseOpeningLine(moves, maxDepth = 4) {
  if (!Array.isArray(moves) || !moves.length) return '';
  const trimmed = moves.slice(0, maxDepth);
  const plyPairs = [];
  for (let i = 0; i < trimmed.length; i += 2) {
    const turn = Math.floor(i / 2) + 1;
    if (trimmed[i] && trimmed[i + 1]) {
      plyPairs.push(`${turn}.${trimmed[i]} ${trimmed[i + 1]}`);
    } else if (trimmed[i]) {
      plyPairs.push(`${turn}.${trimmed[i]}`);
    }
  }
  return plyPairs.join(' ');
}

/**
 * Construit un agrégat simple des ouvertures observées.
 * @param {Array<{ pgn?: string, white?: { username?: string }, black?: { username?: string } }>} games
 * @returns {import('./types.js').DuelOpeningStat[]}
 */
export function buildOpeningTree(games) {
  const counter = new Map();
  for (const game of games || []) {
    const moves = extractMovesFromPgn(game?.pgn);
    if (!moves.length) continue;
    const line = summariseOpeningLine(moves);
    if (!line) continue;
    const firstPlayer = game?.white?.username || game?.black?.username || undefined;
    const key = line.toLowerCase();
    const current = counter.get(key) || { line, count: 0, firstPlayer };
    current.count += 1;
    if (!current.firstPlayer && firstPlayer) {
      current.firstPlayer = firstPlayer;
    }
    counter.set(key, current);
  }
  return Array.from(counter.values()).sort((a, b) => b.count - a.count);
}
