import { createRequestPool, RequestOptions, RequestPool } from '../infrastructure/requestPool';
import { DEFAULT_FETCH_HEADERS, DEFAULT_RETRYABLE_STATUSES } from './constants';

const sharedPool: RequestPool = createRequestPool({
  intervalMs: 200,
  maxConcurrent: 2,
  retryOnStatuses: Array.from(DEFAULT_RETRYABLE_STATUSES),
  retries: 3,
  retryDelayMs: 500,
  max429Retries: 2,
});

export function getRequestPool(): RequestPool {
  return sharedPool;
}

export async function fetchJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    ...DEFAULT_FETCH_HEADERS,
    ...(options.headers ?? {}),
  };
  return sharedPool.requestJson<T>(url, { ...options, headers });
}
