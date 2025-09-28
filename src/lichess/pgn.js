import { Chess } from 'chess.js';

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

export function sanitizeSanSequence(seq = []) {
  return (seq || []).map((san) =>
    String(san || "")
      .trim()
      .replace(/[+#?!]/g, "")
  );
}

export function pgnToFenAndUci(pgn, limitPlies = 20) {
  const chess = new Chess();
  loadPgnCompat(chess, String(pgn || ""), { sloppy: true });
  const history = chess.history({ verbose: true });
  const step = new Chess();
  for (let i = 0; i < Math.min(history.length, limitPlies); i++) {
    step.move(history[i]);
  }
  const fen = step.fen();
  const uciMoves = step
    .history({ verbose: true })
    .map((move) => move.from + move.to + (move.promotion || ""));
  return { fen, uciMoves, plies: uciMoves.length };
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
