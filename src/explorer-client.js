// Client unifié pour interagir avec Lichess Explorer en appliquant cache multi-niveaux,
// déduplication et régulation du débit.
import { fetchExplorer } from '../lichess-explorer.js';

const DEFAULT_EXPLORER_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DEFAULT_MAX_CACHE_ITEMS = 1000;
const DEFAULT_RATE_LIMIT = { rate: 15, per: 60_000, burst: 5 };

let explorerTtlMs = DEFAULT_EXPLORER_TTL_MS;
let maxCacheItems = DEFAULT_MAX_CACHE_ITEMS;
let rateLimitConfig = { ...DEFAULT_RATE_LIMIT };

const mem = new Map(); // key -> { t:number, v:any }
function memGet(k) {
  const it = mem.get(k);
  if (!it) return null;
  if (Date.now() - it.t > explorerTtlMs) {
    mem.delete(k);
    return null;
  }
  mem.delete(k);
  mem.set(k, it);
  return it.v;
}
function memSet(k, v) {
  if (mem.size >= maxCacheItems) {
    const first = mem.keys().next().value;
    if (first) mem.delete(first);
  }
  mem.set(k, { t: Date.now(), v });
}

const IDB_KEY = 'explorer-cache-v1';
function idbAvailable() {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
let idbPromise = null;
function openDb() {
  if (!idbAvailable()) return null;
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_KEY, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}
async function idbGet(k) {
  try {
    const db = await openDb();
    if (!db) return null;
    return await new Promise((res) => {
      const tx = db.transaction('kv', 'readonly');
      const st = tx.objectStore('kv');
      const r = st.get(k);
      r.onsuccess = () => {
        const it = r.result;
        if (!it) return res(null);
        if (Date.now() - it.t > explorerTtlMs) return res(null);
        res(it.v);
      };
      r.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
async function idbSet(k, v) {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((res) => {
      const tx = db.transaction('kv', 'readwrite');
      const st = tx.objectStore('kv');
      st.put({ t: Date.now(), v }, k);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}

function stableKey(opts = {}) {
  const fen = (opts.fen || '').trim();
  const uciMoves = Array.isArray(opts.uciMoves) ? opts.uciMoves.join(' ') : '';
  const speeds = Array.isArray(opts.speeds) ? [...opts.speeds].sort().join(',') : '';
  const ratings = Array.isArray(opts.ratings) ? [...opts.ratings].sort((a, b) => a - b).join(',') : '';
  const top = typeof opts.top === 'number' ? `top=${opts.top}` : '';
  return `fen=${fen}|uci=${uciMoves}|sp=${speeds}|rt=${ratings}|${top}`;
}

const inflight = new Map();

class TokenBucket {
  constructor({ rate, per, burst }) {
    this.rate = rate;
    this.per = per;
    this.capacity = burst ?? rate;
    this.tokens = this.capacity;
    this.last = Date.now();
  }
  _refill() {
    const now = Date.now();
    const elapsed = now - this.last;
    const add = (elapsed / this.per) * this.rate;
    if (add > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + add);
      this.last = now;
    }
  }
  async wait() {
    this._refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const needed = 1 - this.tokens;
    const ms = Math.ceil((needed / this.rate) * this.per);
    await new Promise((r) => setTimeout(r, Math.max(ms, 50)));
    return this.wait();
  }
}
let bucket = new TokenBucket(rateLimitConfig);
const queue = [];
let running = false;
async function runLoop() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    if (!job) continue;
    await bucket.wait();
    await job();
  }
  running = false;
}

export async function explorerQuery(opts) {
  const key = stableKey(opts);
  const memo = memGet(key);
  if (memo) return memo;
  const pending = inflight.get(key);
  if (pending) return pending;
  const cached = await idbGet(key);
  if (cached) {
    memSet(key, cached);
    return cached;
  }
  const p = new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        const data = await fetchExplorer(opts);
        memSet(key, data);
        idbSet(key, data);
        inflight.delete(key);
        resolve(data);
      } catch (err) {
        inflight.delete(key);
        reject(err);
      }
    });
    runLoop();
  });
  inflight.set(key, p);
  return p;
}

export function setExplorerClientOptions({ ttlMs, maxItems, rateLimit } = {}) {
  let shouldResetBucket = false;
  if (Number.isFinite(ttlMs) && ttlMs > 0) {
    explorerTtlMs = ttlMs;
  }
  if (Number.isFinite(maxItems) && maxItems > 0) {
    maxCacheItems = maxItems;
  }
  if (rateLimit && typeof rateLimit === 'object') {
    rateLimitConfig = {
      rate: Number.isFinite(rateLimit.rate) && rateLimit.rate > 0 ? rateLimit.rate : rateLimitConfig.rate,
      per: Number.isFinite(rateLimit.per) && rateLimit.per > 0 ? rateLimit.per : rateLimitConfig.per,
      burst: Number.isFinite(rateLimit.burst) && rateLimit.burst > 0 ? rateLimit.burst : rateLimitConfig.burst,
    };
    shouldResetBucket = true;
  }
  if (shouldResetBucket) {
    bucket = new TokenBucket(rateLimitConfig);
  }
}

export function getExplorerClientOptions() {
  return {
    ttlMs: explorerTtlMs,
    maxItems: maxCacheItems,
    rateLimit: { ...rateLimitConfig },
  };
}

export function clearExplorerMemoryCache() {
  mem.clear();
  inflight.clear();
}

export { stableKey as buildExplorerCacheKey };
