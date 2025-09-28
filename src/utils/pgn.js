import { Chess } from 'https://esm.sh/chess.js';

export function loadPgnCompat(chessInstance, pgn, options) {
  const loader = typeof chessInstance.loadPgn === 'function'
    ? chessInstance.loadPgn
    : typeof chessInstance.load_pgn === 'function'
      ? chessInstance.load_pgn
      : null;
  if (!loader) throw new Error('No loadPgn function available on chess.js instance');
  return loader.call(chessInstance, pgn, options);
}

const DEFAULT_START_FEN = new Chess().fen();
const BLACK_START_FEN = DEFAULT_START_FEN.replace(' w ', ' b ');

export function sanitizeSanSequence(seq = []) {
  return (seq || []).map((san) =>
    String(san || '')
      .trim()
      .replace(/[+#?!]/g, '')
  );
}

export function canonicalizeOpeningTokens(tokens = [], startTurn = 'white', triedBlackFallback = false) {
  const sanitized = sanitizeSanSequence(tokens);
  const chess = new Chess();
  if (startTurn === 'black') {
    if (!chess.load(BLACK_START_FEN)) {
      chess.reset();
    }
  }
  const cleaned = [];
  let warned = false;
  let sawLeadingInvalid = false;
  for (const san of sanitized) {
    if (!san) continue;
    let played;
    try {
      played = chess.move(san, { sloppy: true });
    } catch (err) {
      if (!cleaned.length) {
        sawLeadingInvalid = true;
        continue;
      }
      if (!warned) {
        console.warn('Unable to apply SAN token', san, err);
        warned = true;
      }
      break;
    }
    if (!played) {
      if (!cleaned.length) {
        sawLeadingInvalid = true;
        continue;
      }
      if (!warned) {
        console.warn('Unable to apply SAN token', san);
        warned = true;
      }
      break;
    }
    const canonical = String(played.san || san).replace(/[+#?!]/g, '');
    cleaned.push(canonical);
  }
  if (!cleaned.length && startTurn === 'white' && sawLeadingInvalid && !triedBlackFallback) {
    return canonicalizeOpeningTokens(sanitized, 'black', true);
  }
  return cleaned;
}

export function normalizeToTokens(pgn) {
  if (!pgn || typeof pgn !== 'string') return [];

  const trimmed = pgn.trim();
  const startsWithBlack =
    /^\s*\d+\s*\.\.\./.test(trimmed) ||
    /^\s*\.\.\./.test(trimmed);
  const initialTurn = startsWithBlack ? 'black' : 'white';

  try {
    const chess = new Chess();
    const loaded = loadPgnCompat(chess, pgn, { sloppy: true });
    if (loaded) {
      const history = chess
        .history({ verbose: true })
        .map(move => move?.san || '')
        .filter(Boolean);
      return canonicalizeOpeningTokens(history, 'white');
    }
  } catch (err) {
    console.warn('Failed to parse PGN via chess.js', err);
  }

  let s = pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;.*/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ');

  s = s.replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');
  s = s.replace(/\d+\.(\.\.)?/g, ' ');
  s = s.replace(/[+#]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  if (!s) return [];

  const tokens = s
    .split(' ')
    .filter(tok =>
      /^[O0]-O(-O)?$/.test(tok) ||
      /^[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?$/.test(tok) ||
      /^[a-h]x?[a-h][1-8](=[QRNB])?$/.test(tok) ||
      /^[a-h][1-8]$/.test(tok) ||
      /^[KQRNB][a-h][1-8]$/.test(tok)
    )
    .map(tok => tok.replace(/^0-0$/, 'O-O').replace(/^0-0-0$/, 'O-O-O'));

  return canonicalizeOpeningTokens(tokens, initialTurn);
}
