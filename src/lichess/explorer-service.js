import { buildExplorerFenUrl, buildExplorerPlayUrl } from "./url.js";
import { fetchJson } from "./http.js";

function explorerCacheKey(prefix, { fen, uciMoves, speeds, ratings, variant }) {
  const movesKey = Array.isArray(uciMoves) ? uciMoves.join(",") : "";
  const speedsKey = Array.isArray(speeds) ? speeds.join(",") : "";
  const ratingsKey = Array.isArray(ratings) ? ratings.join(",") : "";
  return `${prefix}|${variant || "standard"}|${fen || ""}|${movesKey}|${speedsKey}|${ratingsKey}`;
}

class ExplorerCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }
}

const explorerCache = new ExplorerCache();

async function fetchWithCache(key, urlBuilder, params) {
  if (explorerCache.has(key)) {
    return explorerCache.get(key);
  }
  const url = urlBuilder(params);
  const data = await fetchJson(url);
  return explorerCache.set(key, data);
}

export async function fetchExplorerByFen(params) {
  const key = explorerCacheKey("fen", params);
  return fetchWithCache(key, buildExplorerFenUrl, params);
}

export async function fetchExplorerByPlay(params) {
  const key = explorerCacheKey("play", params);
  return fetchWithCache(key, buildExplorerPlayUrl, params);
}

export async function fetchExplorer(params) {
  try {
    return await fetchExplorerByFen(params);
  } catch (error) {
    if (params.uciMoves?.length) {
      return fetchExplorerByPlay(params);
    }
    throw error;
  }
}
