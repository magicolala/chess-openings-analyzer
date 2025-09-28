import { LICHESS_MASTER_URL } from "./constants.js";
import { fetchJson } from "./http.js";

const masterCache = new Map();

export async function fetchLichessMasters(fen) {
  const cleanFen = String(fen || "").trim();
  if (!cleanFen) return null;
  if (masterCache.has(cleanFen)) return masterCache.get(cleanFen);
  const url = new URL(LICHESS_MASTER_URL);
  url.searchParams.set("fen", cleanFen);
  const data = await fetchJson(url.toString(), { retries: 3, retryDelayMs: 1000 });
  masterCache.set(cleanFen, data);
  return data;
}
