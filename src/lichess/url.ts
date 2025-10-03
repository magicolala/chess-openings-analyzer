import { LICHESS_BASE_URL } from './constants';
import { ExplorerQuery } from './types';

function setSearchParams(url: URL, params: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      url.searchParams.set(key, value.join(','));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

export function buildExplorerFenUrl({ fen, speeds = ['blitz'], ratings = [1600], variant = 'standard' }: ExplorerQuery): string {
  const url = new URL(LICHESS_BASE_URL);
  setSearchParams(url, { variant, fen, speeds, ratings });
  return url.toString();
}

export function buildExplorerPlayUrl({ uciMoves, speeds = ['blitz'], ratings = [1600], variant = 'standard' }: ExplorerQuery): string {
  const url = new URL(LICHESS_BASE_URL);
  setSearchParams(url, { variant, play: Array.isArray(uciMoves) ? uciMoves : undefined, speeds, ratings });
  return url.toString();
}
