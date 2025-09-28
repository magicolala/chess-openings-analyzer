import { Chess } from 'chess.js';
import { LICHESS_MIN_EXPECTED_SCORE } from "./constants.js";
import { fetchExplorer } from "./explorer-service.js";
import { fetchLichessMasters } from "./masters-service.js";
import { pickLichessBucket } from "./rating.js";
import { sanitizeSanSequence, loadPgnCompat, extractPliesFromPgn } from "./pgn.js";
import { scoreMoves, evaluateMoveAgainstGm } from "./scoring.js";

export async function adviseFromLichess({
  tokens,
  sideToMove = null,
  playerRating,
  ratingOffset = 0,
  speed = "blitz",
  top = 5,
  limitPlies = 20,
}) {
  const chess = new Chess();
  const movesToPlay = sanitizeSanSequence(tokens.slice(0, limitPlies));
  for (const move of movesToPlay) {
    try {
      const played = chess.move(move, { sloppy: true });
      if (!played) {
        console.warn("Invalid move in tokens:", move);
        break;
      }
    } catch (error) {
      console.warn("Invalid move in tokens:", move, error);
      break;
    }
  }
  const fen = chess.fen();
  const uciMoves = chess
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
