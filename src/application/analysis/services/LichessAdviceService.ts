import { Chess } from 'chess.js';
import {
  ExplorerMove,
  ExplorerRequest,
  ExplorerResponse,
  ILichessExplorerClient,
  SpeedCategory,
} from '../../../infrastructure/lichess/LichessExplorerClient';
import {
  GmEvaluationResult,
  GmMajorityConfig,
  ILichessMastersClient,
  LichessMastersResponse,
} from '../../../infrastructure/lichess/LichessMastersClient';

export interface ScoreMovesOptions {
  minExpectedScore?: number;
}

export interface ScoredExplorerMove {
  san: string;
  uci: string;
  total: number;
  sideExpectedScore: number;
  raw: ExplorerMove;
}

export interface AdviceRequest {
  tokens: string[];
  sideToMove?: 'white' | 'black' | null;
  playerRating?: number;
  ratingOffset?: number;
  speed?: SpeedCategory;
  top?: number;
  limitPlies?: number;
}

export interface AdviceResult {
  openingName: string | null;
  eco: string | null;
  totals: { white: number; draws: number; black: number };
  suggestions: ScoredExplorerMove[];
  raw: ExplorerResponse;
  fen: string;
}

export interface AdviceFromPgnRequest {
  pgn: string;
  sideToMove?: 'white' | 'black' | null;
  playerRating?: number;
  ratingOffset?: number;
  speed?: SpeedCategory;
  top?: number;
  limitPlies?: number;
}

export interface PgnToFenAndUciResult {
  fen: string;
  uciMoves: string[];
  plies: number;
}

export interface PgnPly {
  index: number;
  ply: number;
  color: 'white' | 'black';
  moveNumber: number;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

export interface DetectGmDeviationsRequest {
  pgn: string;
  playerColor?: 'white' | 'black';
  limitPlies?: number;
  gmConfig?: GmMajorityConfig;
}

export interface GmDeviation {
  ply: PgnPly;
  masters: LichessMastersResponse | null;
  evaluation: GmEvaluationResult;
}

export interface ILichessAdviceService {
  pickLichessBucket(rating?: number, options?: { offset?: number }): number;
  mapSpeed(category?: string | null): SpeedCategory;
  sanitizeSanSequence(seq?: string[]): string[];
  scoreMoves(data: ExplorerResponse | null, sideToMove?: 'white' | 'black', options?: ScoreMovesOptions): ScoredExplorerMove[];
  adviseFromTokens(request: AdviceRequest): Promise<AdviceResult>;
  adviseFromPgn(request: AdviceFromPgnRequest): Promise<AdviceResult>;
  pgnToFenAndUci(pgn: string, limitPlies?: number): PgnToFenAndUciResult;
  extractPliesFromPgn(pgn: string, limitPlies?: number): PgnPly[];
  detectGmDeviationsFromPgn(request: DetectGmDeviationsRequest): Promise<GmDeviation[]>;
}

const RATING_BUCKETS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
export const LICHESS_MIN_EXPECTED_SCORE = 0.57;

export function loadPgnCompat(chessInstance: Chess, pgn: string, options?: Record<string, unknown>) {
  const loader = typeof chessInstance.loadPgn === 'function'
    ? chessInstance.loadPgn
    : typeof (chessInstance as any).load_pgn === 'function'
      ? (chessInstance as any).load_pgn
      : null;
  if (!loader) {
    throw new Error('No loadPgn function available on chess.js instance');
  }
  return loader.call(chessInstance, pgn, options);
}

export class LichessAdviceService implements ILichessAdviceService {
  constructor(
    private readonly explorerClient: ILichessExplorerClient,
    private readonly mastersClient: ILichessMastersClient,
  ) {}

  pickLichessBucket(rating?: number, { offset = 0 }: { offset?: number } = {}): number {
    const target = Math.max(400, Math.min(3000, Math.round((rating || 1500) + offset)));
    let best = RATING_BUCKETS[0];
    let diff = Infinity;
    for (const bucket of RATING_BUCKETS) {
      const delta = Math.abs(bucket - target);
      if (delta < diff) {
        diff = delta;
        best = bucket;
      }
    }
    return best;
  }

  mapSpeed(category?: string | null): SpeedCategory {
    switch ((category || '').toLowerCase()) {
      case 'bullet':
        return 'bullet';
      case 'rapid':
        return 'rapid';
      case 'daily':
      case 'correspondence':
        return 'correspondence';
      case 'blitz':
      default:
        return 'blitz';
    }
  }

  sanitizeSanSequence(seq: string[] = []): string[] {
    return (seq || []).map((san) =>
      String(san || '')
        .trim()
        .replace(/[+#?!]/g, ''),
    );
  }

  scoreMoves(
    data: ExplorerResponse | null,
    sideToMove: 'white' | 'black' = 'white',
    { minExpectedScore = 0 }: ScoreMovesOptions = {},
  ): ScoredExplorerMove[] {
    if (!data || !Array.isArray(data.moves)) {
      return [];
    }
    return data.moves
      .map((move) => {
        const white = move.white || 0;
        const draws = move.draws || 0;
        const black = move.black || 0;
        const total = white + draws + black;
        const wins = sideToMove === 'white' ? white : black;
        const expected = total ? (wins + 0.5 * draws) / total : 0;
        return {
          san: move.san,
          uci: move.uci,
          total,
          sideExpectedScore: expected,
          raw: move,
        };
      })
      .filter((entry) => entry.sideExpectedScore >= minExpectedScore)
      .sort((a, b) => b.sideExpectedScore - a.sideExpectedScore || b.total - a.total);
  }

  async adviseFromTokens({
    tokens,
    sideToMove = null,
    playerRating,
    ratingOffset = 0,
    speed = 'blitz',
    top = 5,
    limitPlies = 20,
  }: AdviceRequest): Promise<AdviceResult> {
    const chess = new Chess();
    const movesToPlay = this.sanitizeSanSequence(tokens.slice(0, limitPlies));
    for (const move of movesToPlay) {
      try {
        const played = chess.move(move, { sloppy: true });
        if (!played) {
          break;
        }
      } catch {
        break;
      }
    }

    const fen = chess.fen();
    const uciMoves = chess
      .history({ verbose: true })
      .map((move) => move.from + move.to + (move.promotion || ''));
    const plies = uciMoves.length;

    const ratings = [this.pickLichessBucket(playerRating, { offset: ratingOffset })];
    const speeds: SpeedCategory[] = [speed];
    const request: ExplorerRequest = { fen, uciMoves, speeds, ratings };
    const data = await this.explorerClient.fetchExplorer(request);
    const stm = sideToMove ?? (plies % 2 === 0 ? 'white' : 'black');
    const suggestions = this.scoreMoves(data, stm, {
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

  async adviseFromPgn({
    pgn,
    sideToMove = null,
    playerRating,
    ratingOffset = 0,
    speed = 'blitz',
    top = 5,
    limitPlies = 20,
  }: AdviceFromPgnRequest): Promise<AdviceResult> {
    if (!pgn) {
      throw new Error('Missing PGN for adviseFromPgn');
    }
    const chess = new Chess();
    loadPgnCompat(chess, pgn, { sloppy: true });
    const history = chess.history();
    const tokens = history
      .slice(0, limitPlies)
      .map((san) => san)
      .filter(Boolean);

    return this.adviseFromTokens({
      tokens: this.sanitizeSanSequence(tokens),
      sideToMove,
      playerRating,
      ratingOffset,
      speed,
      top,
      limitPlies,
    });
  }

  pgnToFenAndUci(pgn: string, limitPlies = 20): PgnToFenAndUciResult {
    const chess = new Chess();
    loadPgnCompat(chess, String(pgn || ''), { sloppy: true });
    const history = chess.history({ verbose: true });
    const truncated = history.slice(0, Math.min(history.length, limitPlies));
    const replay = new Chess();
    for (const move of truncated) {
      replay.move(move);
    }
    const fen = replay.fen();
    const uciMoves = replay
      .history({ verbose: true })
      .map((move) => move.from + move.to + (move.promotion || ''));
    return { fen, uciMoves, plies: uciMoves.length };
  }

  extractPliesFromPgn(pgn: string, limitPlies = 40): PgnPly[] {
    const chess = new Chess();
    loadPgnCompat(chess, pgn, { sloppy: true });
    const history = chess.history({ verbose: true });
    const step = new Chess();
    const plies: PgnPly[] = [];
    for (let i = 0; i < Math.min(history.length, limitPlies); i++) {
      const move = history[i];
      const fenBefore = step.fen();
      const played = step.move(move);
      if (!played) {
        break;
      }
      const fenAfter = step.fen();
      const moveNumber = Math.floor(i / 2) + 1;
      const san = played.san || move.san || '';
      const uci = `${played.from}${played.to}${played.promotion || ''}`;
      plies.push({
        index: i + 1,
        ply: i + 1,
        color: played.color === 'w' ? 'white' : 'black',
        moveNumber,
        san,
        uci,
        fenBefore,
        fenAfter,
      });
    }
    return plies;
  }

  async detectGmDeviationsFromPgn({
    pgn,
    playerColor = 'white',
    limitPlies = 32,
    gmConfig = {},
  }: DetectGmDeviationsRequest): Promise<GmDeviation[]> {
    if (!pgn) {
      return [];
    }
    const color = playerColor === 'black' ? 'black' : 'white';
    const plies = this.extractPliesFromPgn(pgn, limitPlies);
    const relevant = plies.filter((ply) => ply.color === color);
    const results: GmDeviation[] = [];
    for (const ply of relevant) {
      const masters = await this.mastersClient.fetchMasters(ply.fenBefore);
      const evaluation = this.mastersClient.evaluateMoveAgainstGm(masters, ply.uci, gmConfig);
      results.push({ ply, masters, evaluation });
    }
    return results;
  }
}
