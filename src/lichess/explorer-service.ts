import { createPersistentCache } from '../infrastructure/indexedDbCache';
import { fetchJson } from './http';
import { EXPLORER_CACHE_TTL_MS } from './constants';
import { buildExplorerFenUrl, buildExplorerPlayUrl } from './url';
import { ExplorerQuery, ExplorerResponse } from './types';

const explorerCache = createPersistentCache<ExplorerResponse>({
  dbName: 'lichessExplorer',
  storeName: 'responses',
});

function cacheKey(prefix: string, params: ExplorerQuery): string {
  const fen = params.fen ?? '';
  const moves = params.uciMoves?.join(',') ?? '';
  const speeds = params.speeds?.join(',') ?? '';
  const ratings = params.ratings?.join(',') ?? '';
  const variant = params.variant ?? 'standard';
  return `${prefix}|${variant}|${fen}|${moves}|${speeds}|${ratings}`;
}

async function fetchWithCache(key: string, builder: (params: ExplorerQuery) => string, params: ExplorerQuery): Promise<ExplorerResponse> {
  const cached = await explorerCache.get(key);
  if (cached) {
    return cached;
  }
  const url = builder(params);
  const response = await fetchJson<ExplorerResponse>(url);
  await explorerCache.set(key, response, EXPLORER_CACHE_TTL_MS);
  return response;
}

export async function fetchExplorerByFen(params: ExplorerQuery): Promise<ExplorerResponse> {
  const key = cacheKey('fen', params);
  return fetchWithCache(key, buildExplorerFenUrl, params);
}

export async function fetchExplorerByPlay(params: ExplorerQuery): Promise<ExplorerResponse> {
  const key = cacheKey('play', params);
  return fetchWithCache(key, buildExplorerPlayUrl, params);
}

export async function fetchExplorer(params: ExplorerQuery): Promise<ExplorerResponse> {
  try {
    return await fetchExplorerByFen(params);
  } catch (error) {
    if (params.uciMoves && params.uciMoves.length > 0) {
      return fetchExplorerByPlay(params);
    }
    throw error;
  }
}
