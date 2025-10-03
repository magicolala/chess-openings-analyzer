import { createPersistentCache } from '../infrastructure/indexedDbCache';
import { fetchJson } from './http';
import { LICHESS_MASTER_URL, MASTER_CACHE_TTL_MS } from './constants';
import { MastersResponse } from './types';

const mastersCache = createPersistentCache<MastersResponse>({
  dbName: 'lichessExplorer',
  storeName: 'masters',
});

export async function fetchLichessMasters(fen: string | null | undefined): Promise<MastersResponse | null> {
  const cleanFen = String(fen ?? '').trim();
  if (!cleanFen) {
    return null;
  }
  const cached = await mastersCache.get(cleanFen);
  if (cached) {
    return cached;
  }
  const url = new URL(LICHESS_MASTER_URL);
  url.searchParams.set('fen', cleanFen);
  const data = await fetchJson<MastersResponse>(url.toString());
  await mastersCache.set(cleanFen, data, MASTER_CACHE_TTL_MS);
  return data;
}
