import { Chess } from 'chess.js';
import { LICHESS_MIN_EXPECTED_SCORE } from './constants';
import { fetchExplorer } from './explorer-service';
import { fetchLichessMasters } from './masters-service';
import { pickLichessBucket } from './rating';
import { extractPliesFromPgn, loadPgnCompat, sanitizeSanSequence } from './pgn';
import { evaluateMoveAgainstGm, scoreMoves } from './scoring';
import { ExplorerResponse, GmMajorityConfig, GmMajorityEvaluation, LichessSpeed, ScoredMove } from './types';

export interface AdviseParams {
  tokens: string[];
  sideToMove?: 'white' | 'black';
  playerRating?: number | null;
  ratingOffset?: number;
  speed?: LichessSpeed;
  top?: number;
  limitPlies?: number;
}

export interface AdviceResult {
  openingName: string | null;
  eco: string | null;
  totals: {
    white: number;
    draws: number;
    black: number;
  };
  suggestions: ScoredMove[];
  raw: ExplorerResponse;
  fen: string;
}

export interface AdviseFromPgnParams extends Omit<AdviseParams, 'tokens'> {
  pgn: string;
}

export interface GmDeviation {
  ply: ReturnType<typeof extractPliesFromPgn>[number];
  masters: Awaited<ReturnType<typeof fetchLichessMasters>>;
  evaluation: GmMajorityEvaluation;
}

export async function adviseFromLichess({
  tokens,
  sideToMove = undefined,
  playerRating,
  ratingOffset = 0,
  speed = 'blitz',
  top = 5,
  limitPlies = 20,
}: AdviseParams): Promise<AdviceResult> {
  const chess = new Chess();
  const sanitized = sanitizeSanSequence(tokens.slice(0, limitPlies));
  for (const move of sanitized) {
    try {
      chess.move(move, { sloppy: true } as unknown as Parameters<Chess['move']>[1]);
    } catch (error) {
      console.warn('Invalid move in tokens:', move, error);
      break;
    }
  }
  const fen = chess.fen();
  const uciMoves = chess
    .history({ verbose: true })
    .map((move) => `${move.from}${move.to}${move.promotion ?? ''}`);
  const plies = uciMoves.length;

  const ratings = [pickLichessBucket(playerRating ?? null, { offset: ratingOffset })];
  const speeds = [speed];

  const data = await fetchExplorer({ fen, uciMoves, speeds, ratings });
  const stm = sideToMove ?? (plies % 2 === 0 ? 'white' : 'black');
  const suggestions = scoreMoves(data, stm, {
    minExpectedScore: LICHESS_MIN_EXPECTED_SCORE,
  }).slice(0, top);

  return {
    openingName: data?.opening?.name ?? null,
    eco: data?.opening?.eco ?? null,
    totals: { white: data.white, draws: data.draws, black: data.black },
    suggestions,
    raw: data,
    fen,
  };
}

export async function adviseFromLichessPgn({
  pgn,
  sideToMove,
  playerRating,
  ratingOffset = 0,
  speed = 'blitz',
  top = 5,
  limitPlies = 20,
}: AdviseFromPgnParams): Promise<AdviceResult> {
  if (!pgn) {
    throw new Error('Missing PGN for adviseFromLichessPgn');
  }
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
  playerColor = 'white',
  limitPlies = 32,
  gmConfig = {},
}: {
  pgn: string;
  playerColor?: 'white' | 'black';
  limitPlies?: number;
  gmConfig?: GmMajorityConfig;
}): Promise<GmDeviation[]> {
  if (!pgn) {
    return [];
  }
  const color = playerColor === 'black' ? 'black' : 'white';
  const plies = extractPliesFromPgn(pgn, limitPlies);
  const relevant = plies.filter((ply) => ply.color === color);
  const results: GmDeviation[] = [];
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
