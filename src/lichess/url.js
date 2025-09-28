import { LICHESS_BASE_URL } from "./constants.js";

function setSearchParams(url, params) {
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    if (Array.isArray(value) && value.length) {
      url.searchParams.set(key, value.join(","));
    } else if (!Array.isArray(value)) {
      url.searchParams.set(key, value);
    }
  }
}

export function buildExplorerFenUrl({
  fen,
  speeds = ["blitz"],
  ratings = [1600],
  variant = "standard",
}) {
  const url = new URL(LICHESS_BASE_URL);
  setSearchParams(url, { variant, fen, speeds, ratings });
  return url.toString();
}

export function buildExplorerPlayUrl({
  uciMoves,
  speeds = ["blitz"],
  ratings = [1600],
  variant = "standard",
}) {
  const url = new URL(LICHESS_BASE_URL);
  setSearchParams(url, { variant, play: Array.isArray(uciMoves) ? uciMoves : null, speeds, ratings });
  return url.toString();
}
