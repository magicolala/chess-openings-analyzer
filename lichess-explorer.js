// lichess-explorer.js — outils Explorer & Masters
// npm i chess.js  (ou <script type="module" src="https://cdn.jsdelivr.net/npm/chess.js@1/dist/chess.min.js">)
import { Chess } from "https://esm.sh/chess.js";

export function loadPgnCompat(chessInstance, pgn, options) {
  const loader = typeof chessInstance.loadPgn === "function"
    ? chessInstance.loadPgn
    : typeof chessInstance.load_pgn === "function"
      ? chessInstance.load_pgn
      : null;
  if (!loader) {
    throw new Error("No loadPgn function available on chess.js instance");
  }
  return loader.call(chessInstance, pgn, options);
}

const BASE = "https://explorer.lichess.ovh/lichess";
const MASTER_BASE = "https://explorer.lichess.ovh/master";
const RATING_BUCKETS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

const explorerCache = new Map();
const masterCache = new Map();

export const LICHESS_MIN_EXPECTED_SCORE = 0.57;

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

export function mapSpeed(chesscomCategory) {
  switch ((chesscomCategory || "").toLowerCase()) {
    case "bullet":
      return "bullet";
    case "blitz":
      return "blitz";
    case "rapid":
      return "rapid";
    case "daily":
    case "correspondence":
      return "correspondence";
    default:
      return "blitz";
  }
}

export function pgnToFenAndUci(pgn, limitPlies = 20) {
  const c = new Chess();
  loadPgnCompat(c, String(pgn || ""), { sloppy: true });
  const hist = c.history({ verbose: true });
  const c2 = new Chess();
  for (let i = 0; i < Math.min(hist.length, limitPlies); i++) c2.move(hist[i]);
  const fen = c2.fen();
  const uciMoves = c2
    .history({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion || ""));
  return { fen, uciMoves, plies: uciMoves.length };
}

export function sanitizeSanSequence(seq = []) {
  return (seq || []).map((san) =>
    String(san || "")
      .trim()
      .replace(/[+#?!]/g, "")
  );
}

function buildUrlFen({
  fen,
  speeds = ["blitz"],
  ratings = [1600],
  variant = "standard",
}) {
  const u = new URL(BASE);
  u.searchParams.set("variant", variant);
  u.searchParams.set("fen", fen);
  if (speeds?.length) u.searchParams.set("speeds", speeds.join(","));
  if (ratings?.length) u.searchParams.set("ratings", ratings.join(","));
  return u.toString();
}

function buildUrlPlay({
  uciMoves,
  speeds = ["blitz"],
  ratings = [1600],
  variant = "standard",
}) {
  const u = new URL(BASE);
  u.searchParams.set("variant", variant);
  if (uciMoves?.length) u.searchParams.set("play", uciMoves.join(","));
  if (speeds?.length) u.searchParams.set("speeds", speeds.join(","));
  if (ratings?.length) u.searchParams.set("ratings", ratings.join(","));
  return u.toString();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(
  url,
  {
    retries = 2,
    retryDelayMs = 800,
    retryOnStatuses = [429],
    headers = { Accept: "application/json" },
  } = {}
) {
  let attempt = 0;
  let delayMs = retryDelayMs;
  while (true) {
    const r = await fetch(url, { headers });
    if (r.ok) {
      return r.json();
    }

    const status = r.status;
    if (retryOnStatuses.includes(status) && attempt < retries) {
      const retryAfter = Number(r.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : delayMs;
      await wait(waitMs);
      attempt += 1;
      delayMs *= 2;
      continue;
    }

    const body = await r.text().catch(() => "");
    const e = new Error(`Lichess API failed with status ${status}`);
    e.status = status;
    e.body = body;
    e.url = url;
    throw e;
  }
}

function explorerCacheKey(prefix, { fen, uciMoves, speeds, ratings, variant }) {
  const movesKey = Array.isArray(uciMoves) ? uciMoves.join(",") : "";
  const speedsKey = Array.isArray(speeds) ? speeds.join(",") : "";
  const ratingsKey = Array.isArray(ratings) ? ratings.join(",") : "";
  return `${prefix}|${variant || "standard"}|${fen || ""}|${movesKey}|${speedsKey}|${ratingsKey}`;
}

export async function fetchExplorerByFen(params) {
  const key = explorerCacheKey("fen", params);
  if (explorerCache.has(key)) return explorerCache.get(key);
  const url = buildUrlFen(params);
  const data = await fetchJson(url);
  explorerCache.set(key, data);
  return data;
}

export async function fetchExplorerByPlay(params) {
  const key = explorerCacheKey("play", params);
  if (explorerCache.has(key)) return explorerCache.get(key);
  const url = buildUrlPlay(params);
  const data = await fetchJson(url);
  explorerCache.set(key, data);
  return data;
}

export async function fetchExplorer(params) {
  try {
    return await fetchExplorerByFen(params);
  } catch (err) {
    if (params.uciMoves?.length) {
      return await fetchExplorerByPlay(params);
    }
    throw err;
  }
}

export async function fetchLichessMasters(fen) {
  const cleanFen = String(fen || "").trim();
  if (!cleanFen) return null;
  if (masterCache.has(cleanFen)) return masterCache.get(cleanFen);
  const url = new URL(MASTER_BASE);
  url.searchParams.set("fen", cleanFen);
  const data = await fetchJson(url.toString(), { retries: 3, retryDelayMs: 1000 });
  masterCache.set(cleanFen, data);
  return data;
}

// Score attendu pour le camp au trait après CHAQUE coup proposé
export function scoreMoves(data, sideToMove = "white", { minExpectedScore = 0 } = {}) {
  if (!data || !Array.isArray(data.moves)) return [];
  return data.moves
    .map((m) => {
      const W = m.white || 0;
      const D = m.draws || 0;
      const B = m.black || 0;
      const total = W + D + B;
      const wins = sideToMove === "white" ? W : B;
      const exp = total ? (wins + 0.5 * D) / total : 0;
      return {
        san: m.san,
        uci: m.uci,
        total,
        sideExpectedScore: exp,
        raw: m,
      };
    })
    .filter((entry) => entry.sideExpectedScore >= minExpectedScore)
    .sort((a, b) => b.sideExpectedScore - a.sideExpectedScore || b.total - a.total);
}

export async function adviseFromLichess({
  tokens,
  sideToMove = null,
  playerRating,
  ratingOffset = 0,
  speed = "blitz",
  top = 5,
  limitPlies = 20,
}) {
  const c = new Chess();
  const movesToPlay = sanitizeSanSequence(tokens.slice(0, limitPlies));
  for (const move of movesToPlay) {
    try {
      const played = c.move(move, { sloppy: true });
      if (!played) {
        console.warn("Invalid move in tokens:", move);
        break;
      }
    } catch (err) {
      console.warn("Invalid move in tokens:", move, err);
      break;
    }
  }
  const fen = c.fen();
  const uciMoves = c
    .history({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion || ""));
  const plies = uciMoves.length;

  const ratings = [pickLichessBucket(playerRating, { offset: ratingOffset })];
  const speeds = [speed];

  const data = await fetchExplorer({ fen, uciMoves, speeds, ratings });
  const stm = sideToMove ?? (plies % 2 === 0 ? "white" : "black");
  const suggestions = scoreMoves(data, stm, {
    minExpectedScore: LICHESS_MIN_EXPECTED_SCORE,
  }).slice(0, top);

  return {
    openingName: data?.opening?.name || null,
    eco: data?.opening?.eco || null,
    totals: { white: data.white, draws: data.draws, black: data.black },
    suggestions,
    raw: data,
    fen,
  };
}

export async function adviseFromLichessPgn({
  pgn,
  sideToMove = null,
  playerRating,
  ratingOffset = 0,
  speed = "blitz",
  top = 5,
  limitPlies = 20,
}) {
  if (!pgn) throw new Error("Missing PGN for adviseFromLichessPgn");
  const chess = new Chess();
  loadPgnCompat(chess, pgn, { sloppy: true });
  const history = chess.history();
  const tokens = history
    .slice(0, limitPlies)
    .map((san) => san)
    .filter(Boolean);
  return adviseFromLichess({
    tokens: sanitizeSanSequence(tokens),
    sideToMove,
    playerRating,
    ratingOffset,
    speed,
    top,
    limitPlies,
  });
}

function sumMasterMove(move) {
  return (move.white || 0) + (move.draws || 0) + (move.black || 0);
}

export function computeGmMajority(mastersData, {
  gmMode = "top1",
  gmTopK = 1,
  coverageThreshold = 0.7,
  minMasterGames = 50,
} = {}) {
  if (!mastersData || !Array.isArray(mastersData.moves)) {
    return { considered: false, reason: "noData" };
  }
  const sorted = [...mastersData.moves].sort((a, b) => sumMasterMove(b) - sumMasterMove(a));
  const total = sorted.reduce((acc, move) => acc + sumMasterMove(move), 0);
  if (total < minMasterGames) {
    return { considered: false, reason: "lowVolume", total };
  }

  const picked = [];
  if (gmMode === "coverage") {
    const target = Math.max(0.01, Math.min(1, coverageThreshold));
    let acc = 0;
    for (const move of sorted) {
      const vol = sumMasterMove(move);
      acc += vol;
      picked.push({ move, coverage: acc / total });
      if (acc / total >= target) break;
    }
  } else if (gmMode === "topK") {
    const limit = Math.max(1, gmTopK | 0);
    for (let i = 0; i < Math.min(limit, sorted.length); i++) {
      picked.push({ move: sorted[i], coverage: sumMasterMove(sorted[i]) / total });
    }
  } else {
    if (sorted.length) {
      picked.push({ move: sorted[0], coverage: sumMasterMove(sorted[0]) / total });
    }
  }

  const majoritySet = new Set(picked.map((entry) => entry.move.uci));
  const coverage = picked.reduce((acc, entry) => acc + sumMasterMove(entry.move), 0) / total;
  return {
    considered: true,
    total,
    coverage,
    majoritySet,
    pickedMoves: picked.map((entry) => ({
      uci: entry.move.uci,
      san: entry.move.san,
      volume: sumMasterMove(entry.move),
      coverage: entry.coverage,
    })),
    topMove: sorted[0]
      ? {
          uci: sorted[0].uci,
          san: sorted[0].san,
          volume: sumMasterMove(sorted[0]),
          coverage: sumMasterMove(sorted[0]) / total,
        }
      : null,
  };
}

export function evaluateMoveAgainstGm(mastersData, playedUci, config) {
  const evaluation = computeGmMajority(mastersData, config);
  if (!evaluation.considered) {
    return { ...evaluation, inBook: null };
  }
  const inBook = evaluation.majoritySet.has(playedUci);
  return {
    ...evaluation,
    inBook,
  };
}

export function extractPliesFromPgn(pgn, limitPlies = 40) {
  const chess = new Chess();
  loadPgnCompat(chess, pgn, { sloppy: true });
  const history = chess.history({ verbose: true });
  const step = new Chess();
  const plies = [];
  for (let i = 0; i < Math.min(history.length, limitPlies); i++) {
    const move = history[i];
    const fenBefore = step.fen();
    const played = step.move(move);
    if (!played) break;
    const fenAfter = step.fen();
    const moveNumber = Math.floor(i / 2) + 1;
    const san = played.san || move.san || "";
    const uci = `${played.from}${played.to}${played.promotion || ""}`;
    plies.push({
      index: i + 1,
      ply: i + 1,
      color: played.color === "w" ? "white" : "black",
      moveNumber,
      san,
      uci,
      fenBefore,
      fenAfter,
    });
  }
  return plies;
}

export async function detectGmDeviationsFromPgn({
  pgn,
  playerColor = "white",
  limitPlies = 32,
  gmConfig = {},
}) {
  if (!pgn) return [];
  const color = playerColor === "black" ? "black" : "white";
  const plies = extractPliesFromPgn(pgn, limitPlies);
  const relevant = plies.filter((ply) => ply.color === color);
  const results = [];
  for (const ply of relevant) {
    const masters = await fetchLichessMasters(ply.fenBefore);
    const evalResult = evaluateMoveAgainstGm(masters, ply.uci, gmConfig);
    results.push({
      ply,
      masters,
      evaluation: evalResult,
    });
  }
  return results;
}
