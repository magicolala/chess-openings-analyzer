// Cache léger en mémoire pour les recommandations Lichess afin d'éviter
// les requêtes redondantes durant une session d'analyse.
import { adviseFromLichess } from '../lichess-explorer.js';

const adviseMem = new Map();
const ADVISE_TTL_MS = 1000 * 60 * 60 * 24;

function keyForAdvise({ tokens, sideToMove, playerRating, ratingOffset, speed, top }) {
  return JSON.stringify({ tokens, sideToMove, playerRating, ratingOffset, speed, top });
}

export async function adviseCached(params) {
  const key = keyForAdvise(params || {});
  const existing = adviseMem.get(key);
  if (existing && Date.now() - existing.t < ADVISE_TTL_MS) {
    return existing.v;
  }
  const value = await adviseFromLichess(params);
  adviseMem.set(key, { t: Date.now(), v: value });
  return value;
}

export function clearAdviseCache() {
  adviseMem.clear();
}
