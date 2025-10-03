export const LICHESS_BASE_URL = 'https://explorer.lichess.ovh/lichess';
export const LICHESS_MASTER_URL = 'https://explorer.lichess.ovh/master';

export const RATING_BUCKETS = Object.freeze([400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500]);

export const LICHESS_MIN_EXPECTED_SCORE = 0.57;

export const DEFAULT_FETCH_HEADERS: HeadersInit = Object.freeze({ Accept: 'application/json' });

export const DEFAULT_RETRYABLE_STATUSES = Object.freeze([502, 503, 504]);

export const EXPLORER_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export const MASTER_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
