import { RATING_BUCKETS } from "./constants.js";

export function pickLichessBucket(rating, { offset = 0 } = {}) {
  const target = Math.max(
    400,
    Math.min(3000, Math.round((rating || 1500) + offset))
  );
  let best = RATING_BUCKETS[0];
  let diff = Infinity;
  for (const bucket of RATING_BUCKETS) {
    const d = Math.abs(bucket - target);
    if (d < diff) {
      diff = d;
      best = bucket;
    }
  }
  return best;
}
