import { RATING_BUCKETS } from './constants';

export function pickLichessBucket(rating: number | null | undefined, { offset = 0 } = {}): number {
  const target = Math.max(400, Math.min(3000, Math.round((rating ?? 1500) + offset)));
  let best = RATING_BUCKETS[0];
  let diff = Number.POSITIVE_INFINITY;
  for (const bucket of RATING_BUCKETS) {
    const d = Math.abs(bucket - target);
    if (d < diff) {
      diff = d;
      best = bucket;
    }
  }
  return best;
}
