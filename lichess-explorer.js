// lichess-explorer.js — version béton
// npm i chess.js  (ou <script type="module" src="https://cdn.jsdelivr.net/npm/chess.js@1/dist/chess.min.js">)
import { Chess } from "https://esm.sh/chess.js";

const BASE = "https://explorer.lichess.ovh/lichess";
const RATING_BUCKETS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

export function pickLichessBucket(rating, { offset = 0 } = {}) {
  const target = Math.max(
    400,
    Math.min(3000, Math.round((rating || 1500) + offset))
  );
  let best = RATING_BUCKETS[0],
    diff = Infinity;
  for (const b of RATING_BUCKETS) {
    const d = Math.abs(b - target);
    if (d < diff) {
      diff = d;
      best = b;
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

// PGN -> FEN + UCI des N premiers demi-coups (robuste, pas tes SAN amputés)
export function pgnToFenAndUci(pgn, limitPlies = 20) {
  const c = new Chess();
  c.load_pgn(String(pgn || ""), { sloppy: true });
  const hist = c.history({ verbose: true });
  const c2 = new Chess();
  for (let i = 0; i < Math.min(hist.length, limitPlies); i++) c2.move(hist[i]);
  const fen = c2.fen();
  const uciMoves = c2
    .history({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion || ""));
  return { fen, uciMoves, plies: uciMoves.length };
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

async function fetchJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    const e = new Error(`Lichess API failed with status ${r.status}`);
    e.status = r.status;
    e.body = body;
    e.url = url;
    throw e;
  }
  return r.json();
}

// Score attendu pour le camp au trait après CHAQUE coup proposé
export function scoreMoves(data, sideToMove = "white") {
  if (!data || !Array.isArray(data.moves)) return [];
  return data.moves
    .map((m) => {
      const W = m.white || 0,
        D = m.draws || 0,
        B = m.black || 0;
      const total = W + D + B;
      const wins = sideToMove === "white" ? W : B;
      const exp = total ? (wins + 0.5 * D) / total : 0;
      return {
        san: m.san,
        uci: m.uci,
        total,
        sideExpectedScore: exp, // 0..1
        raw: m,
      };
    })
    .sort(
      (a, b) => b.sideExpectedScore - a.sideExpectedScore || b.total - a.total
    );
}

// API principale: tu donnes des tokens (SAN moves), on renvoie les conseils classés
export async function adviseFromLichess({
  tokens,
  sideToMove = null,
  playerRating,
  ratingOffset = 0,
  speed = "blitz",
  top = 5,
  limitPlies = 20,
}) {
  // Convert tokens to FEN and UCI moves
  const c = new Chess();
  const movesToPlay = tokens.slice(0, limitPlies);
  for (const move of movesToPlay) {
    try {
      c.move(move);
    } catch (e) {
      console.warn('Invalid move in tokens:', move);
      break;
    }
  }
  const fen = c.fen();
  const uciMoves = c.history({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
  const plies = uciMoves.length;

  const ratings = [pickLichessBucket(playerRating, { offset: ratingOffset })];
  const speeds = [speed];

  let data;
  try {
    // Préfère la FEN: c'est le plus propre
    data = await fetchJson(buildUrlFen({ fen, speeds, ratings }));
  } catch (e1) {
    // Fallback en "play=e2e4,e7e5,..."
    data = await fetchJson(buildUrlPlay({ uciMoves, speeds, ratings }));
  }

  const stm = sideToMove ?? (plies % 2 === 0 ? "white" : "black");
  const suggestions = scoreMoves(data, stm).slice(0, top);

  return {
    openingName: data?.opening?.name || null,
    eco: data?.opening?.eco || null,
    totals: { white: data.white, draws: data.draws, black: data.black },
    suggestions,
  };
}
