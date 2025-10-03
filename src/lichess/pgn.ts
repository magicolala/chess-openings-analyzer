import { Chess } from 'chess.js';
import { sanitizeSanSequence } from '../utils/tokenizer';

export type ChessInstance = Chess;

type LoadPgnOptions = { sloppy?: boolean; newlineChar?: string; strict?: boolean };

export function loadPgnCompat(chessInstance: ChessInstance, pgn: string, options?: LoadPgnOptions): boolean {
  const candidate: unknown = (chessInstance as unknown as { loadPgn?: unknown }).loadPgn ?? (chessInstance as unknown as { load_pgn?: unknown }).load_pgn;
  if (typeof candidate !== 'function') {
    throw new Error('No loadPgn function available on chess.js instance');
  }
  return candidate.call(chessInstance, pgn, options);
}

export function pgnToFenAndUci(pgn: string, limitPlies = 20): { fen: string; uciMoves: string[]; plies: number } {
  const chess = new Chess();
  loadPgnCompat(chess, String(pgn ?? ''), { sloppy: true });
  const history = chess.history({ verbose: true });
  const step = new Chess();
  for (let i = 0; i < Math.min(history.length, limitPlies); i += 1) {
    step.move(history[i]);
  }
  const fen = step.fen();
  const uciMoves = step
    .history({ verbose: true })
    .map((move) => `${move.from}${move.to}${move.promotion ?? ''}`);
  return { fen, uciMoves, plies: uciMoves.length };
}

export interface PlyInfo {
  index: number;
  ply: number;
  color: 'white' | 'black';
  moveNumber: number;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

export function extractPliesFromPgn(pgn: string, limitPlies = 40): PlyInfo[] {
  const chess = new Chess();
  loadPgnCompat(chess, pgn, { sloppy: true });
  const history = chess.history({ verbose: true });
  const step = new Chess();
  const plies: PlyInfo[] = [];
  for (let i = 0; i < Math.min(history.length, limitPlies); i += 1) {
    const move = history[i];
    const fenBefore = step.fen();
    const played = step.move(move);
    if (!played) {
      break;
    }
    const fenAfter = step.fen();
    const moveNumber = Math.floor(i / 2) + 1;
    const san = played.san ?? move.san ?? '';
    const uci = `${played.from}${played.to}${played.promotion ?? ''}`;
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

export { sanitizeSanSequence };
