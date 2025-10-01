// Module principal orchestrant l'interface et les flux d'analyse Chess.com.
import { Chess } from 'chess.js';
import {
  Chessboard,
  BORDER_TYPE,
  FEN,
} from 'cm-chessboard';
import chessboardPiecesUrl from 'cm-chessboard/assets/pieces/standard.svg?url';
import {
  adviseFromLichess,
  detectGmDeviationsFromPgn,
  extractPliesFromPgn,
  pgnToFenAndUci,
  fetchExplorer,
  LICHESS_MIN_EXPECTED_SCORE,
  pickLichessBucket,
  scoreMoves,
} from '../lichess-explorer.js';
import { registerEcoOpenings } from '../eco-pack-xl.js';
import { TrapEngine, TRAP_PACK } from '../trap-engine.js';
import { ULTRA_TRAPS } from '../trap-pack-ultra.js';
import { mountDuelModeView } from './features/duel-mode/index.js';

// ------------ ECO MAP DE BASE + PACK XL ------------
const ECO_OPENINGS = new Map([
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'].join(' '), 'Espagnole (Ruy Lopez)'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'].join(' '), 'Italienne (Giuoco Piano)'],
  [['e4', 'e5', 'Nf3', 'Nf6'].join(' '), 'Défense Petrov'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'd4'].join(' '), 'Écossaise'],
  [['e4', 'e5', 'Nf3', 'f5'].join(' '), 'Gambit Letton'],
  [['e4', 'e5', 'f4'].join(' '), 'Gambit du Roi'],
  [['e4', 'e5', 'Nc3'].join(' '), 'Viennoise'],
  [['e4', 'e5', 'Bc4'].join(' '), 'Partie du Fou'],

  // Sicilienne
  [['e4', 'c5'].join(' '), 'Défense Sicilienne'],
  [['e4', 'c5', 'Nf3', 'd6'].join(' '), 'Sicilienne Dragon (setup)'],
  [['e4', 'c5', 'Nf3', 'Nc6'].join(' '), 'Sicilienne Classique'],
  [['e4', 'c5', 'Nf3', 'e6'].join(' '), 'Sicilienne Variante Française'],
  [['e4', 'c5', 'Nf3', 'Nf6'].join(' '), 'Sicilienne Nimzowitsch'],
  [['e4', 'c5', 'c3'].join(' '), 'Sicilienne Alapin'],

  // Française
  [['e4', 'e6'].join(' '), 'Défense Française'],
  [['e4', 'e6', 'd4', 'd5'].join(' '), 'Française (Var. principale)'],
  [['e4', 'e6', 'd4', 'd5', 'e5'].join(' '), 'Française Avance'],
  [['e4', 'e6', 'd4', 'd5', 'Nc3'].join(' '), 'Française Classique'],
  [['e4', 'e6', 'd4', 'd5', 'exd5'].join(' '), 'Française Échange'],

  // Caro-Kann
  [['e4', 'c6'].join(' '), 'Défense Caro-Kann'],
  [['e4', 'c6', 'd4', 'd5'].join(' '), 'Caro-Kann (Var. principale)'],
  [['e4', 'c6', 'd4', 'd5', 'Nc3'].join(' '), 'Caro-Kann Classique'],
  [['e4', 'c6', 'd4', 'd5', 'e5'].join(' '), 'Caro-Kann Avance'],

  // Autres vs e4
  [['e4', 'd5'].join(' '), 'Défense Scandinave'],
  [['e4', 'd6'].join(' '), 'Défense Pirc'],
  [['e4', 'Nf6'].join(' '), 'Défense Alekhine'],
  [['e4', 'g6'].join(' '), 'Défense Moderne'],
  [['e4', 'Nc6'].join(' '), 'Défense Nimzowitsch'],
  [['e4', 'a6'].join(' '), 'Défense St. George'],
  [['e4', 'b6'].join(' '), 'Défense Owen'],

  // d4
  [['d4', 'd5'].join(' '), 'Partie du Pion Dame'],
  [['d4', 'd5', 'c4'].join(' '), 'Gambit Dame'],
  [['d4', 'd5', 'c4', 'dxc4'].join(' '), 'Gambit Dame Accepté'],
  [['d4', 'd5', 'c4', 'e6'].join(' '), 'Gambit Dame Refusé'],
  [['d4', 'd5', 'c4', 'c6'].join(' '), 'Défense Slave'],
  [['d4', 'd5', 'Nf3'].join(' '), 'Système de Londres (ordre flexible)'],
  [['d4', 'd5', 'Bf4'].join(' '), 'Système de Londres (avec Bf4)'],

  // Indiennes
  [['d4', 'Nf6'].join(' '), 'Défenses Indiennes'],
  [['d4', 'Nf6', 'c4', 'e6'].join(' '), 'Nimzo/Ouest-Indienne (set-up)'],
  [['d4', 'Nf6', 'c4', 'g6'].join(' '), 'Est-Indienne (set-up)'],
  [['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'].join(' '), 'Défense Nimzo-Indienne'],
  [['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'].join(' '), 'Défense Ouest-Indienne'],
  [['d4', 'Nf6', 'c4', 'c5'].join(' '), 'Défense Benoni Moderne'],
  [['d4', 'Nf6', 'Nf3', 'g6'].join(' '), 'Est-Indienne (avec Nf3)'],

  // Autres d4
  [['d4', 'f5'].join(' '), 'Défense Hollandaise'],
  [['d4', 'e6'].join(' '), 'Française par transposition'],
  [['d4', 'g6'].join(' '), 'Moderne vs d4'],
  [['d4', 'd6'].join(' '), 'Old Indian'],
  [['d4', 'c5'].join(' '), 'Benoni Ancienne'],

  // Anglaise, Réti et co
  [['c4'].join(' '), 'Ouverture Anglaise'],
  [['c4', 'e5'].join(' '), 'Anglaise Symétrique (réponse e5)'],
  [['c4', 'c5'].join(' '), 'Anglaise Symétrique (Sicilienne inversée)'],
  [['c4', 'Nf6'].join(' '), 'Anglaise avec Nf6'],
  [['c4', 'e6'].join(' '), 'Anglaise avec e6'],

  [['Nf3'].join(' '), 'Ouverture Réti'],
  [['Nf3', 'd5'].join(' '), 'Réti avec d5'],
  [['Nf3', 'Nf6'].join(' '), 'Réti Symétrique'],
  [['Nf3', 'd5', 'c4'].join(' '), 'Gambit Réti'],

  [['f4'].join(' '), 'Ouverture Bird'],
  [['b3'].join(' '), 'Ouverture Larsen'],
  [['g3'].join(' '), 'Ouverture Benko (fianchetto)'],
  [['Nc3'].join(' '), 'Ouverture Van Geet'],
  [['e3'].join(' '), "Ouverture Van't Kruijs"],
  [['b4'].join(' '), 'Ouverture Polonaise'],
]);

// Injecte le pack XL + pièges
registerEcoOpenings(ECO_OPENINGS, { includeTraps: true });

const trapEngine = new TrapEngine();
trapEngine.register([...TRAP_PACK, ...ULTRA_TRAPS]);

let pinnedAnchor = null;

const ANALYSIS_MODES = {
  opponent: 'opponent',
  self: 'self',
};

const state = {
  mode: ANALYSIS_MODES.opponent,
  latestPrep: null,
  latestPlayer: null,
  speed: 'blitz',
  ratingBucket: null,
  config: null,
  selectedOpenings: {
    white: new Set(),
    black: new Set(),
  },
  lichessLoading: false,
  pendingLichess: {
    white: new Set(),
    black: new Set(),
  },
  lichessCooldownUntil: 0,
  lichessCooldownTimer: null,
};

function normalizeSide(side) {
  return side === 'black' ? 'black' : 'white';
}

function resolveOrientationForMode(side, mode = state.mode) {
  const normalized = normalizeSide(side);
  if (mode === ANALYSIS_MODES.opponent) {
    return normalized === 'white' ? 'black' : 'white';
  }
  return normalized;
}

// ------------ FALLBACK 1er COUP ------------
const FIRST_MOVE_FALLBACK = new Map([
  ['e4', 'Ouvertures ouvertes (1.e4)'],
  ['d4', 'Ouvertures fermées (1.d4)'],
  ['c4', 'Ouverture Anglaise'],
  ['Nf3', 'Ouverture Réti'],
  ['f4', 'Ouverture Bird'],
  ['b3', 'Ouverture Larsen'],
  ['g3', 'Fianchetto (type Réti/Anglaise)'],
  ['Nc3', 'Ouverture Van Geet'],
  ['e3', "Ouverture Van't Kruijs"],
  ['b4', 'Ouverture Polonaise'],
]);

// ------------ UTILS GÉNÉRAUX ------------
const FR = new Intl.DisplayNames(['fr'], { type: 'region' });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])
  );
}

function getSelectionSet(side) {
  const key = side === 'black' ? 'black' : 'white';
  if (!state.selectedOpenings) {
    state.selectedOpenings = { white: new Set(), black: new Set() };
  }
  if (!(state.selectedOpenings[key] instanceof Set)) {
    const existing = Array.isArray(state.selectedOpenings[key])
      ? state.selectedOpenings[key]
      : [];
    state.selectedOpenings[key] = new Set(existing);
  }
  return state.selectedOpenings[key];
}

function normalizeOpeningCollection(collection) {
  if (collection instanceof Set) return new Set(collection);
  if (Array.isArray(collection)) return new Set(collection);
  return new Set();
}

function setPendingLichessSelections(values = {}) {
  state.pendingLichess = {
    white: normalizeOpeningCollection(values.white),
    black: normalizeOpeningCollection(values.black),
  };
}

function clearPendingLichessSelections() {
  setPendingLichessSelections();
}

function resetLichessSelection(whiteOpenings, blackOpenings, { limit = 3 } = {}) {
  const pickTop = (openings) => Object.entries(openings || {})
    .sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))
    .slice(0, limit)
    .map(([name]) => name);
  state.selectedOpenings = {
    white: new Set(pickTop(whiteOpenings)),
    black: new Set(pickTop(blackOpenings)),
  };
}

function decodeOpeningKey(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

function countSelectedOpenings() {
  const white = state.selectedOpenings?.white instanceof Set ? state.selectedOpenings.white.size : 0;
  const black = state.selectedOpenings?.black instanceof Set ? state.selectedOpenings.black.size : 0;
  return { white, black, total: white + black };
}

function countPendingOpenings() {
  const white = state.pendingLichess?.white instanceof Set ? state.pendingLichess.white.size : 0;
  const black = state.pendingLichess?.black instanceof Set ? state.pendingLichess.black.size : 0;
  return { white, black, total: white + black };
}

function hasPendingLichess() {
  const { total } = countPendingOpenings();
  return total > 0;
}

function isLichessCooldownActive() {
  return state.lichessCooldownUntil && Date.now() < state.lichessCooldownUntil;
}

function updateLichessCooldownUi() {
  const resumeBtn = document.getElementById('resumeLichessBtn');
  const notice = document.getElementById('lichessCooldownNotice');
  const counts = countPendingOpenings();
  const hasPending = counts.total > 0;
  const cooldownActive = isLichessCooldownActive();

  if (resumeBtn) {
    resumeBtn.hidden = !hasPending;
    resumeBtn.disabled = !hasPending || state.lichessLoading || cooldownActive;
    if (hasPending) {
      const suffix = counts.total > 0 ? ` (${counts.total})` : '';
      resumeBtn.textContent = `Analyser le reste${suffix}`;
    } else {
      resumeBtn.textContent = 'Analyser le reste';
    }
  }

  if (notice) {
    if (cooldownActive) {
      const remaining = Math.max(0, state.lichessCooldownUntil - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      notice.hidden = false;
      notice.textContent = `Pause requise par Lichess : réessayez dans ${seconds}s.`;
    } else {
      notice.hidden = true;
      notice.textContent = '';
    }
  }
}

function clearLichessCooldown({ skipUiUpdate = false } = {}) {
  if (state.lichessCooldownTimer) {
    clearInterval(state.lichessCooldownTimer);
    state.lichessCooldownTimer = null;
  }
  state.lichessCooldownUntil = 0;
  if (!skipUiUpdate) {
    updateLichessCooldownUi();
  }
}

function scheduleLichessCooldown(durationMs = 60000) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    durationMs = 60000;
  }
  if (state.lichessCooldownTimer) {
    clearInterval(state.lichessCooldownTimer);
  }
  state.lichessCooldownUntil = Date.now() + durationMs;
  state.lichessCooldownTimer = window.setInterval(() => {
    if (!isLichessCooldownActive()) {
      clearLichessCooldown({ skipUiUpdate: true });
      updateLichessSelectionSummary();
    } else {
      updateLichessCooldownUi();
    }
  }, 1000);
  updateLichessSelectionSummary();
}

function showLichessSelectionControls() {
  const el = document.getElementById('lichessSelection');
  if (el) el.style.display = 'flex';
  updateLichessSelectionSummary();
}

function hideLichessSelectionControls() {
  const el = document.getElementById('lichessSelection');
  if (el) el.style.display = 'none';
}

function updateLichessSelectionSummary() {
  const summaryEl = document.getElementById('lichessSelectionSummary');
  const { white, black, total } = countSelectedOpenings();
  if (summaryEl) {
    summaryEl.textContent = `Blancs : ${white} · Noirs : ${black}`;
  }
  const btn = document.getElementById('runLichessBtn');
  if (btn) {
    const cooldownActive = isLichessCooldownActive();
    btn.disabled = total === 0 || state.lichessLoading || cooldownActive;
    if (state.lichessLoading) {
      btn.textContent = 'Analyse Lichess en cours…';
    } else if (cooldownActive) {
      btn.textContent = 'En attente du délai Lichess…';
    } else {
      btn.textContent = 'Analyser les ouvertures sélectionnées';
    }
  }
  updateLichessCooldownUi();
}

function getCountryNameFromUrl(url) {
  try {
    if (!url) return 'N/A';
    const code = url.split('/').pop();
    return code ? (FR.of(code) || code) : 'N/A';
  } catch {
    return 'N/A';
  }
}

function tokensToLineInfo(tokens, { limit = null } = {}) {
  if (!Array.isArray(tokens) || !tokens.length) {
    return { line: '', fen: '', moveCount: 0, moves: [] };
  }

  const trimmed = limit ? tokens.slice(0, limit) : [...tokens];
  const chess = new Chess();
  const parts = [];
  let moveNumber = 1;
  let turn = 'white';
  const applied = [];

  for (const move of trimmed) {
    if (!move) continue;
    try {
      chess.move(move);
      applied.push(move);
    } catch {
      break;
    }
    if (turn === 'white') {
      parts.push(`${moveNumber}. ${move}`);
      turn = 'black';
    } else {
      const lastIndex = parts.length - 1;
      if (lastIndex >= 0) parts[lastIndex] += ` ${move}`;
      moveNumber++;
      turn = 'white';
    }
  }

  const history = chess.history();
  const fen = history.length ? chess.fen() : '';
  const fallback = applied.length
    ? applied.join(' ')
    : trimmed.filter(Boolean).join(' ');

  return {
    line: parts.join(' ') || fallback,
    fen,
    moveCount: history.length,
    moves: applied,
  };
}

function buildLinePreview(tokens, { limit = null, extraClass = '', orientation = 'white' } = {}) {
  const info = tokensToLineInfo(tokens, { limit });
  if (!info.line) return { html: '', info };
  const fenAttr = info.fen ? ` data-fen="${escapeHtml(info.fen)}"` : '';
  const movesAttr = info.moves?.length
    ? ` data-moves="${escapeHtml(info.moves.join('|'))}"`
    : '';
  const classAttr = extraClass ? ` ${extraClass}` : '';
  const orientationAttr = orientation ? ` data-orientation="${orientation}"` : '';
  const html = `
    <button type="button" class="line-preview${classAttr}"${fenAttr}${movesAttr}${orientationAttr} data-line="${escapeHtml(info.line)}">
      ${escapeHtml(info.line)}
    </button>
  `;
  return { html, info };
}

function renderMainLine(tokens, orientation = 'white') {
  if (!tokens || !tokens.length) return '';
  const { html } = buildLinePreview(tokens, { limit: 14, orientation });
  if (!html) return '';
  return `
    <div class="line-block">
      <div class="line-label">Ligne principale</div>
      ${html}
    </div>
  `;
}

function renderObservedTraps(traps = [], orientation = 'white') {
  if (!Array.isArray(traps) || !traps.length) return '';
  const seen = new Set();
  const items = [];
  for (const trap of traps) {
    if (!trap?.id || seen.has(trap.id)) continue;
    seen.add(trap.id);
    const seq = Array.isArray(trap.seq) ? trap.seq : [];
    const { html } = buildLinePreview(seq, { orientation });
    if (!html) continue;
    const advice = trap.advice ? `<div class="line-meta">${escapeHtml(trap.advice)}</div>` : '';
    items.push(`
      <div class="observed-trap">
        <div class="trap-detected-name">💥 ${escapeHtml(trap.name)}</div>
        ${html}
        ${advice}
      </div>
    `);
  }
  if (!items.length) return '';
  return `
    <div class="observed-traps">
      <div class="observed-traps-header">Pièges repérés dans vos parties</div>
      ${items.join('')}
    </div>
  `;
}

function renderTrapRecommendations(recs = [], orientation = 'white') {
  if (!Array.isArray(recs) || !recs.length) return '';
  const chunks = recs.map(rec => {
    const seq = Array.isArray(rec.seq) ? rec.seq : [];
    const { html } = buildLinePreview(seq, { extraClass: 'trap-reco-line', orientation });
    if (!html) return '';
    return `
      <div class="trap-reco">
        <div class="trap-reco-name">💣 ${escapeHtml(rec.name)}</div>
        ${html}
        <div class="trap-reco-tip">💡 ${escapeHtml(rec.advice)}</div>
      </div>
    `;
  }).filter(Boolean);
  if (!chunks.length) return '';
  return `<div class="trap-recos">${chunks.join('')}</div>`;
}

function withTimeout(ms, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  const t = setTimeout(() => ctrl.abort(), ms);
  const cleanup = () => clearTimeout(t);
  return { signal: ctrl.signal, cleanup };
}

// ------------ PGN → TOKENS ------------
function loadPgnCompat(chessInstance, pgn, options) {
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

function normalizeToTokens(pgn) {
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
  s = s.replace(/[+#]/g, '');
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

function sanitizeSanSequence(seq = []) {
  return (seq || []).map((san) =>
    String(san || '')
      .trim()
      .replace(/[+#?!]/g, '')
  );
}

function canonicalizeOpeningTokens(tokens = [], startTurn = 'white', triedBlackFallback = false) {
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
    // Certains PGN tronqués commencent directement par un coup noir ("1... e5").
    return canonicalizeOpeningTokens(sanitized, 'black', true);
  }
  return cleaned;
}

// ------------ MATCHING OUVERTURE ------------
const MAX_OPENING_DETECTION_PLIES = 20;
const LICHESS_OPENING_CACHE = new Map();

function getOpeningNameFromLocal(tokens) {
  if (!tokens.length) return 'Ouverture inconnue';
  const maxPlies = Math.min(tokens.length, MAX_OPENING_DETECTION_PLIES);
  for (let plies = maxPlies; plies >= 2; plies--) {
    const prefix = tokens.slice(0, plies).join(' ');
    if (ECO_OPENINGS.has(prefix)) return ECO_OPENINGS.get(prefix);
    // Prioriser les séquences les plus longues (souvent issues du pack XL)
    let bestName = null;
    let bestLen = -1;
    for (const [pattern, name] of ECO_OPENINGS.entries()) {
      if (prefix === pattern || prefix.startsWith(pattern + ' ')) {
        const len = pattern ? pattern.split(' ').length : 0;
        if (len > bestLen) {
          bestLen = len;
          bestName = name;
        }
      }
    }
    if (bestName) return bestName;
  }
  const first = tokens[0];
  if (FIRST_MOVE_FALLBACK.has(first)) return FIRST_MOVE_FALLBACK.get(first);
  if (first === 'O-O' || first === 'O-O-O') return 'Ouverture avec roque rapide';
  return 'Ouverture inconnue';
}

function getOpeningDetectionCacheKey({ fen, uciMoves }) {
  if (fen) return `fen:${fen}`;
  if (Array.isArray(uciMoves) && uciMoves.length) return `uci:${uciMoves.join(' ')}`;
  return '';
}

function toExplorerParamsFromPgn(pgn, limitPlies = MAX_OPENING_DETECTION_PLIES) {
  if (!pgn) return { fen: null, uciMoves: [], key: '' };
  try {
    const { fen, uciMoves } = pgnToFenAndUci(pgn, limitPlies);
    const moves = Array.isArray(uciMoves) ? uciMoves.filter(Boolean) : [];
    return {
      fen: fen || null,
      uciMoves: moves,
      key: getOpeningDetectionCacheKey({ fen: fen || null, uciMoves: moves }),
    };
  } catch (err) {
    console.warn('Failed to build explorer params from PGN', err);
    return { fen: null, uciMoves: [], key: '' };
  }
}

async function fetchOpeningFromLichessExplorer(params) {
  const hasFen = params?.fen;
  const hasMoves = Array.isArray(params?.uciMoves) && params.uciMoves.length > 0;
  if (!hasFen && !hasMoves) return null;
  try {
    const data = await fetchExplorer({
      fen: hasFen ? params.fen : undefined,
      uciMoves: hasMoves ? params.uciMoves : undefined,
    });
    const opening = data?.opening;
    if (opening?.name) {
      return { name: opening.name, eco: opening.eco || null, source: 'lichess' };
    }
  } catch (err) {
    console.warn('Failed to fetch opening from Lichess explorer', err);
  }
  return null;
}

async function resolveOpeningName({ tokens, explorerParams }) {
  const localName = getOpeningNameFromLocal(tokens);
  const hasFen = explorerParams?.fen;
  const hasMoves = Array.isArray(explorerParams?.uciMoves) && explorerParams.uciMoves.length > 0;
  if (!hasFen && !hasMoves) {
    return { name: localName, eco: null, source: 'local' };
  }
  const cacheKey = explorerParams?.key;
  if (cacheKey && LICHESS_OPENING_CACHE.has(cacheKey)) {
    return LICHESS_OPENING_CACHE.get(cacheKey);
  }
  const fetched = await fetchOpeningFromLichessExplorer(explorerParams);
  const result = fetched || { name: localName, eco: null, source: 'local' };
  if (cacheKey) {
    LICHESS_OPENING_CACHE.set(cacheKey, result);
  }
  return result;
}

function getOpeningName(tokens) {
  return getOpeningNameFromLocal(tokens);
}
// ------------ FETCH & ANALYSE ------------
const MONTHS_TO_CHECK = 3;
const FETCH_TIMEOUT_MS = 10000;

// Helper: côté au trait après N demi-coups
function sideToMoveAfter(tokens) {
  // trait blanc au début; si nb de demi-coups est pair -> trait aux blancs, sinon noirs
  return (tokens.length % 2 === 0) ? 'white' : 'black';
}

async function fetchPlayerContext(username) {
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(username)}`;
  const { signal, cleanup } = withTimeout(FETCH_TIMEOUT_MS);
  const [playerRes, statsRes] = await Promise.all([
    fetch(base, { signal }),
    fetch(`${base}/stats`, { signal }),
  ]);
  cleanup();

  if (!playerRes.ok) throw new Error('Joueur non trouvé');
  const playerData = await playerRes.json();
  const statsData = statsRes.ok ? await statsRes.json() : {};

  const now = new Date();
  const months = Array.from({ length: MONTHS_TO_CHECK }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { y: d.getFullYear(), m: String(d.getMonth() + 1).padStart(2, '0') };
  });

  const monthFetches = months.map(({ y, m }) => {
    const { signal, cleanup } = withTimeout(FETCH_TIMEOUT_MS);
    return fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${y}/${m}`, { signal })
      .then((r) => {
        cleanup();
        return r.ok ? r.json() : { games: [] };
      })
      .catch(() => ({ games: [] }));
  });

  const monthPayloads = await Promise.allSettled(monthFetches);
  const recentGames = monthPayloads.flatMap((res) =>
    res.status === 'fulfilled' ? (res.value.games || []) : []
  );

  const games = recentGames.filter((g) => (g.rules ? g.rules === 'chess' : true));
  if (!games.length) throw new Error('Aucune partie récente trouvée');

  return { playerData, statsData, games };
}

function ensureOpeningBucket(collection, name) {
  if (!collection[name]) {
    collection[name] = {
      count: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      traps: [],
      games: [],
      _sampleTokens: null,
      _samplePgn: null,
      _mainTokens: null,
    };
  }
  return collection[name];
}

async function aggregateOpenings(games, username) {
  const lower = String(username || '').toLowerCase();
  const whiteOpenings = {};
  const blackOpenings = {};

  for (const game of games) {
    if (!game?.pgn) continue;
    const youAreWhite =
      game.white &&
      game.white.username &&
      String(game.white.username).toLowerCase() === lower;
    const tokens = normalizeToTokens(game.pgn).slice(0, MAX_OPENING_DETECTION_PLIES);
    const explorerParams = toExplorerParamsFromPgn(game.pgn, MAX_OPENING_DETECTION_PLIES);
    let openingInfo;
    try {
      openingInfo = await resolveOpeningName({ tokens, explorerParams });
    } catch (err) {
      console.warn('Failed to resolve opening with Lichess explorer', err);
      openingInfo = { name: getOpeningNameFromLocal(tokens), eco: null, source: 'local' };
    }
    const openingName = openingInfo?.name || getOpeningNameFromLocal(tokens);
    const targetOpenings = youAreWhite ? whiteOpenings : blackOpenings;
    const bucket = ensureOpeningBucket(targetOpenings, openingName);

    if (!bucket._sampleTokens && tokens.length) bucket._sampleTokens = tokens;
    if (!bucket._samplePgn && game.pgn) bucket._samplePgn = game.pgn;
    if (openingInfo?.eco && !bucket.eco) bucket.eco = openingInfo.eco;
    if (openingInfo?.source && !bucket._openingSource) bucket._openingSource = openingInfo.source;

    bucket.count += 1;
    const whiteResult = game.white?.result;
    const blackResult = game.black?.result;
    let result = 'draw';
    const whiteTimeoutLoss = whiteResult === 'timeout' && blackResult === 'win';
    const blackTimeoutLoss = blackResult === 'timeout' && whiteResult === 'win';
    if (whiteResult === 'win' || blackTimeoutLoss) {
      result = youAreWhite ? 'win' : 'loss';
    } else if (blackResult === 'win' || whiteTimeoutLoss) {
      result = youAreWhite ? 'loss' : 'win';
    }

    if (result === 'win') bucket.wins += 1;
    else if (result === 'draw') bucket.draws += 1;
    else bucket.losses += 1;

    bucket.games.push({
      pgn: game.pgn,
      youAreWhite,
      endTime: game.end_time,
      url: game.url,
      opponent: youAreWhite ? game.black?.username : game.white?.username,
    });

    const trapScan = trapEngine.matchPgn(game.pgn, {
      openingLabel: openingName,
      side: youAreWhite ? 'white' : 'black',
      maxPlies: 24,
    });
    if (trapScan.hits.length) {
      bucket.traps.push(...trapScan.hits.slice(0, 2));
      bucket.isTrap = true;
    }
  }

  return { whiteOpenings, blackOpenings };
}

// Choix cadence par défaut en fonction des stats Chess.com
function pickSpeedFromChesscom(statsData) {
  const order = ['chess_blitz', 'chess_rapid', 'chess_bullet'];
  for (const k of order) {
    if (statsData?.[k]?.last?.rating) {
      const map = { chess_blitz: 'blitz', chess_rapid: 'rapid', chess_bullet: 'bullet' };
      return map[k];
    }
  }
  return 'blitz';
}

function determineTargetSpeed(statsData, override) {
  if (override && override !== 'auto') return override;
  return pickSpeedFromChesscom(statsData);
}

function computePlayerRating(statsData) {
  return (
    statsData?.chess_blitz?.last?.rating ||
    statsData?.chess_rapid?.last?.rating ||
    statsData?.chess_bullet?.last?.rating ||
    statsData?.chess_rapid?.last?.best?.rating ||
    statsData?.chess_blitz?.last?.best?.rating ||
    statsData?.chess_bullet?.last?.best?.rating ||
    1500
  );
}

function readNumberInput(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const value = Number(el.value);
  return Number.isFinite(value) ? value : fallback;
}

function readAnalysisConfig() {
  const gmMode = document.getElementById('gmMode').value;
  return {
    speedOverride: document.getElementById('speedSelect').value,
    ratingOffset: readNumberInput('ratingOffset', 0),
    gmMode,
    gmTopK: readNumberInput('gmTopK', 3),
    gmCoverage: readNumberInput('gmCoverage', 70) / 100,
    minMasterGames: readNumberInput('minMasterGames', 50),
  };
}

function updateGmOptionVisibility() {
  const gmMode = document.getElementById('gmMode').value;
  const topKField = document.getElementById('gmTopKField');
  const coverageField = document.getElementById('gmCoverageField');
  if (gmMode === 'topK') {
    topKField.style.display = 'block';
    coverageField.style.display = 'none';
  } else if (gmMode === 'coverage') {
    topKField.style.display = 'none';
    coverageField.style.display = 'block';
  } else {
    topKField.style.display = 'none';
    coverageField.style.display = 'none';
  }
}

function setAnalysisMode(mode) {
  if (!Object.values(ANALYSIS_MODES).includes(mode)) return;
  state.mode = mode;
  const buttons = document.querySelectorAll('.mode-btn');
  buttons.forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.textContent =
      mode === ANALYSIS_MODES.opponent
        ? 'Préparez vos parties contre un adversaire précis'
        : 'Analysez vos propres débuts et trouvez des gains rapides';
  }
  state.latestPrep = null;
  state.latestPlayer = null;
  hideResults();
}

async function enrichWithLichessSuggestions(openingsObject, playerElo, chesscomStats, config, options = {}) {
  const entries = Object.entries(openingsObject);
  const speed = determineTargetSpeed(chesscomStats, config.speedOverride);
  const ratingBucket = pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });
  const side = options.side === 'black' ? 'black' : 'white';

  let targetEntries;
  if (Array.isArray(options.onlyOpenings) && options.onlyOpenings.length) {
    const allowed = new Set(options.onlyOpenings);
    targetEntries = entries.filter(([name]) => allowed.has(name));
  } else {
    targetEntries = entries.sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  }

  let analyzed = 0;
  const processed = [];
  for (let index = 0; index < targetEntries.length; index++) {
    const [name, stats] = targetEntries[index];
    const sampleTokens = stats._sampleTokens || null;
    if (!sampleTokens?.length) {
      processed.push(name);
      continue;
    }
    try {
      const trait = sideToMoveAfter(sampleTokens);
      const out = await adviseFromLichess({
        tokens: sampleTokens,
        sideToMove: trait,
        playerRating: playerElo,
        ratingOffset: config.ratingOffset || 0,
        speed,
        top: 5,
      });
      if (out) {
        out.ratingBucket = ratingBucket;
        out.speed = speed;
        stats._lichess = out;

        // Définir la ligne principale à partir des suggestions Lichess
        try {
          const threshold = LICHESS_MIN_EXPECTED_SCORE;
          const suggestions = Array.isArray(out.suggestions) ? out.suggestions : [];
          const best = suggestions
            .filter((s) => (s?.sideExpectedScore || 0) >= threshold)
            .sort((a, b) => (b.sideExpectedScore - a.sideExpectedScore) || (b.total - a.total))[0]
            || suggestions[0];
          if (best?.san) {
            const base = Array.isArray(sampleTokens) ? sampleTokens : [];
            const main = sanitizeSanSequence([...base, best.san].filter(Boolean));
            if (main?.length) stats._mainTokens = main;
          }
        } catch {}
        analyzed += 1;
      }
      processed.push(name);
    } catch (err) {
      if (err?.status === 429) {
        err.processedOpenings = processed.slice();
        err.remainingOpenings = targetEntries.slice(index).map(([openingName]) => openingName);
        err.lichessSide = side;
        throw err;
      }
      console.warn('Explorer Lichess en échec pour', name, err?.status || '', err?.url || '', err);
      processed.push(name);
    }
  }

  return { speed, ratingBucket, analyzed, processedOpenings: processed };
}

function formatScoreLabel(score) {
  if (!score) return null;
  if (score.type === 'mate') {
    const sign = score.value > 0 ? '+' : '';
    return `#${sign}${score.value}`;
  }
  if (score.type === 'cp') {
    const value = Number(score.value || 0) / 100;
    return `${value.toFixed(2)}`;
  }
  return null;
}

function describeGmError(err) {
  if (!err) {
    return {
      type: 'unknown',
      message: "Analyse théorie GM indisponible pour le moment.",
    };
  }
  if (err.status === 429) {
    return {
      type: 'rateLimit',
      message: "Trop de requêtes vers Lichess Masters. Réessayez dans quelques instants.",
    };
  }
  if (err.status === 404) {
    return {
      type: 'notFound',
      message: "Référence GM indisponible pour cette ligne.",
    };
  }
  return {
    type: 'generic',
    message: err.message || "Analyse théorie GM indisponible.",
  };
}

async function annotateWithGmTheory(openingsObject, {
  playerColor,
  config,
  ratingBucket,
  speed,
  isSelfAnalysis = false,
}) {
  const gmConfig = {
    gmMode: config.gmMode,
    gmTopK: config.gmTopK,
    coverageThreshold: config.gmCoverage,
    minMasterGames: config.minMasterGames,
  };
  const entries = Object.entries(openingsObject)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);
  const ourSide = isSelfAnalysis
    ? playerColor
    : playerColor === 'white'
      ? 'black'
      : 'white';

  for (const [name, stats] of entries) {
    if (!stats._samplePgn) continue;
    const tokens = Array.isArray(stats._sampleTokens)
      ? stats._sampleTokens
      : normalizeToTokens(stats._samplePgn).slice(0, 24);
    delete stats._gmError;
    try {
      const gmHits = await detectGmDeviationsFromPgn({
        pgn: stats._samplePgn,
        playerColor,
        limitPlies: 32,
        gmConfig,
      });
      const outOfBook = [];
      for (const item of gmHits) {
        const evaluation = item?.evaluation;
        if (!evaluation?.considered || evaluation.inBook !== false) continue;
        const tokensBefore = tokens.slice(
          0,
          isSelfAnalysis ? Math.max(0, item.ply.ply - 1) : item.ply.ply
        );
        let recommendation = null;
        let alternatives = [];
        let recommendationSource = 'lichess';
        const referenceFen = isSelfAnalysis
          ? item.ply.fenBefore
          : item.ply.fenAfter;

        try {
          if (!referenceFen) {
            throw new Error('FEN indisponible pour la recommandation GM');
          }
          const data = await fetchExplorer({
            fen: referenceFen,
            speeds: [speed],
            ratings: [ratingBucket],
          });
          const moves = scoreMoves(data, ourSide).slice(0, 3);
          if (moves.length) {
            recommendation = moves[0];
            alternatives = moves;
          }
        } catch (err) {
          console.warn('Explorer suggestions indisponibles pour réponse GM', err?.status || '', err?.url || '', err);
        }

        if (!recommendation) continue;

        outOfBook.push({
          ply: item.ply,
          evaluation,
          masters: item.masters,
          recommendation,
          recommendationSource,
          alternatives,
          tokensBefore,
          analyzedSide: ourSide,
          orientation: ourSide,
        });
      }
      if (outOfBook.length) {
        stats._gmOutOfBook = outOfBook;
      } else {
        delete stats._gmOutOfBook;
      }
    } catch (err) {
      console.warn('Analyse théorie GM impossible pour', name, err);
      delete stats._gmOutOfBook;
      stats._gmError = describeGmError(err);
    }
  }
}

async function computeImprovementPlans(openingsObject, {
  playerColor,
  ratingBucket,
  speed,
  threshold = 0.08,
}) {
  const entries = Object.entries(openingsObject)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  for (const [name, stats] of entries) {
    if (!stats._samplePgn) continue;
    const tokens = Array.isArray(stats._sampleTokens)
      ? stats._sampleTokens
      : normalizeToTokens(stats._samplePgn).slice(0, 28);
    const plies = extractPliesFromPgn(stats._samplePgn, 32).filter(
      (ply) => ply.color === playerColor
    );
    const improvements = [];
    for (const ply of plies) {
      try {
        const data = await fetchExplorer({
          fen: ply.fenBefore,
          speeds: [speed],
          ratings: [ratingBucket],
        });
        const moves = scoreMoves(data, playerColor).slice(0, 5);
        if (!moves.length) continue;
        const ourMove = moves.find((m) => m.uci === ply.uci);
        const best = moves[0];
        if (!best) continue;
        const ourScore = ourMove ? ourMove.sideExpectedScore : 0;
        const delta = best.sideExpectedScore - ourScore;
        let recommendation = best;
        let alternatives = moves;
        let recommendationSource = 'lichess';

        if (delta < threshold) continue;

        const tokensBefore = tokens.slice(0, Math.max(0, ply.ply - 1));
        improvements.push({
          ply,
          delta,
          recommendation,
          recommendationSource,
          alternatives,
          tokensBefore,
          ourMove,
        });
        if (improvements.length >= 3) break;
      } catch (err) {
        console.warn('Impossible de calculer une amélioration pour', name, err);
      }
    }
    if (improvements.length) {
      stats._improvements = improvements;
    }
  }
}

async function runAnalysis() {
  const usernameInput = document.getElementById('username');
  const btn = document.getElementById('analyzeBtn');
  const username = usernameInput.value.trim();
  if (!username) {
    showError('Veuillez entrer un pseudo Chess.com');
    return;
  }

  const config = readAnalysisConfig();
  state.config = config;

  hideError();
  showLoading();
  hideResults();
  clearPendingLichessSelections();
  clearLichessCooldown();
  btn.disabled = true;

  try {
    const context = await fetchPlayerContext(username);
    const { playerData, statsData, games } = context;
    const { whiteOpenings, blackOpenings } = await aggregateOpenings(games, username);
    const playerElo = computePlayerRating(statsData);

    state.speed = determineTargetSpeed(statsData, config.speedOverride);
    state.ratingBucket = pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });

    resetLichessSelection(whiteOpenings, blackOpenings);

    const isSelfAnalysis = state.mode === ANALYSIS_MODES.self;

    await annotateWithGmTheory(whiteOpenings, {
      playerColor: 'white',
      config,
      ratingBucket: state.ratingBucket,
      speed: state.speed,
      isSelfAnalysis,
    });
    await annotateWithGmTheory(blackOpenings, {
      playerColor: 'black',
      config,
      ratingBucket: state.ratingBucket,
      speed: state.speed,
      isSelfAnalysis,
    });

    if (isSelfAnalysis) {
      await computeImprovementPlans(whiteOpenings, {
        playerColor: 'white',
        ratingBucket: state.ratingBucket,
        speed: state.speed,
        threshold: 0.08,
      });
      await computeImprovementPlans(blackOpenings, {
        playerColor: 'black',
        ratingBucket: state.ratingBucket,
        speed: state.speed,
        threshold: 0.08,
      });
    }

    state.latestPrep = {
      mode: state.mode,
      player: playerData,
      stats: statsData,
      whiteOpenings,
      blackOpenings,
      speed: state.speed,
      ratingBucket: state.ratingBucket,
      config,
    };
    state.latestPlayer = playerData;

    displayPlayerInfo(playerData, statsData);
    displayOpenings(whiteOpenings, blackOpenings, state.mode);
    showLichessSelectionControls();
    showPrepActions();
  } catch (err) {
    showError(err.message || 'Erreur inconnue');
  } finally {
    hideLoading();
    btn.disabled = false;
  }
}

async function runSelectedLichessAnalysis(options = {}) {
  if (!state.latestPrep) {
    showError("Aucune préparation disponible pour lancer l'analyse Lichess.");
    return;
  }

  if (state.lichessLoading) {
    return;
  }

  if (isLichessCooldownActive()) {
    const remaining = Math.max(0, state.lichessCooldownUntil - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    showError(`Patientez encore ${seconds}s avant de relancer l'analyse Lichess.`);
    updateLichessSelectionSummary();
    return;
  }

  const usePending = options?.resume && hasPendingLichess();
  const selections = usePending
    ? {
      white: Array.from(state.pendingLichess?.white || []),
      black: Array.from(state.pendingLichess?.black || []),
    }
    : {
      white: Array.from(getSelectionSet('white')),
      black: Array.from(getSelectionSet('black')),
    };

  if (!selections.white.length && !selections.black.length) {
    return;
  }

  hideError();
  state.lichessLoading = true;
  updateLichessSelectionSummary();

  const pending = {
    white: new Set(selections.white),
    black: new Set(selections.black),
  };

  const { whiteOpenings, blackOpenings, stats, config } = state.latestPrep;
  const playerElo = computePlayerRating(stats);

  const processSide = async (side, openings) => {
    const names = Array.from(pending[side]);
    if (!names.length) return null;
    const result = await enrichWithLichessSuggestions(
      openings,
      playerElo,
      stats,
      config,
      { onlyOpenings: names, side }
    );
    if (Array.isArray(result?.processedOpenings)) {
      result.processedOpenings.forEach((name) => pending[side].delete(name));
    } else {
      names.forEach((name) => pending[side].delete(name));
    }
    return result;
  };

  try {
    await processSide('white', whiteOpenings);
    await processSide('black', blackOpenings);
    displayOpenings(whiteOpenings, blackOpenings, state.mode);
    clearPendingLichessSelections();
    clearLichessCooldown();
  } catch (err) {
    if (err?.status === 429) {
      const side = err.lichessSide === 'black' ? 'black' : 'white';
      if (Array.isArray(err.processedOpenings)) {
        err.processedOpenings.forEach((name) => pending[side].delete(name));
      }
      if (Array.isArray(err.remainingOpenings)) {
        pending[side] = new Set(err.remainingOpenings);
      }
      setPendingLichessSelections(pending);
      const waitMs = err.retryAfterMs || 60000;
      scheduleLichessCooldown(waitMs);
      displayOpenings(whiteOpenings, blackOpenings, state.mode);
      const waitSeconds = Math.ceil(waitMs / 1000);
      showError(`Trop de requêtes vers Lichess. Patientez ${waitSeconds}s puis utilisez "Analyser le reste".`);
    } else {
      showError(err?.message || "Impossible d'obtenir les recommandations Lichess.");
    }
  } finally {
    state.lichessLoading = false;
    updateLichessSelectionSummary();
  }
}

// ------------ UI ------------
function renderLichessAdvice(stats, { side = 'white', mode = state.mode } = {}) {
  if (!stats._lichess?.suggestions?.length) return '';
  const o = stats._lichess;
  const tag = o.openingName ? ` (${o.openingName}${o.eco ? ' – ' + o.eco : ''})` : '';
  const baseTokens = Array.isArray(stats._sampleTokens) ? stats._sampleTokens : [];
  const orientation = resolveOrientationForMode(side, mode);
  const ourSide = orientation;
  const threshold = LICHESS_MIN_EXPECTED_SCORE;
  const eligibleSuggestions = o.suggestions.filter((s) =>
    (s?.sideExpectedScore || 0) >= threshold
  );
  const thresholdLabel = Math.round(threshold * 100);
  if (!eligibleSuggestions.length) {
    return `
    <details class="lichess-advice">
      <summary>Coups recommandés (Lichess)${tag}</summary>
      <div class="lichess-advice-empty">Aucun coup ne dépasse ${thresholdLabel}% de score attendu.</div>
    </details>
  `;
  }
  const items = eligibleSuggestions.slice(0, 3).map(s => {
    const tokens = sanitizeSanSequence([...baseTokens, s.san].filter(Boolean));
    const { html, info } = buildLinePreview(tokens, { limit: baseTokens.length + 1, orientation });
    const fallbackText = info.line || s.san;
    const trapScan = trapEngine.matchTokens(tokens, {
      openingLabel: '',
      side: ourSide,
      maxPlies: tokens.length + 4,
    });
    const trapBadge = trapScan.hits.length ? '<span class="badge badge-trap">Piège dispo</span>' : '';
    const button = html || `
      <button
        type="button"
        class="line-preview"
        data-line="${escapeHtml(fallbackText)}"
        data-orientation="${orientation}"
        ${info.moves?.length ? `data-moves="${escapeHtml(info.moves.join('|'))}"` : ''}
        ${info.fen ? `data-fen="${escapeHtml(info.fen)}"` : ''}
      >
        ${escapeHtml(fallbackText)}
      </button>
    `;
    const score = Math.round((s.sideExpectedScore || 0) * 100);
    return `
      <li>
        ${button}
        <div class="line-meta">Score attendu ${score}% · ${s.total} parties ${trapBadge}</div>
      </li>
    `;
  }).join('');
  return `
    <details class="lichess-advice">
      <summary>Coups recommandés (Lichess)${tag}</summary>
      <ul>${items}</ul>
    </details>
  `;
}

function buildPreviewButton(tokens, { orientation }) {
  const { html, info } = buildLinePreview(tokens, { limit: tokens.length + 1, orientation });
  if (html) return html;
  const fallbackText = info.line || tokens.join(' ');
  return `
    <button
      type="button"
      class="line-preview"
      data-line="${escapeHtml(fallbackText)}"
      data-orientation="${orientation}"
      ${info.moves?.length ? `data-moves="${escapeHtml(info.moves.join('|'))}"` : ''}
      ${info.fen ? `data-fen="${escapeHtml(info.fen)}"` : ''}
    >
      ${escapeHtml(fallbackText)}
    </button>
  `;
}

function renderGmOutOfBook(stats, { side, mode } = {}) {
  const entries = Array.isArray(stats._gmOutOfBook) ? stats._gmOutOfBook : [];
  const gmError = stats._gmError;
  if (!entries.length) {
    if (gmError?.message) {
      return `<div class="gm-entry gm-error">${escapeHtml(gmError.message)}</div>`;
    }
    return '';
  }
  const items = entries.slice(0, 3).map((entry) => {
    const entrySide = entry.analyzedSide
      || entry.orientation
      || entry.ply?.color
      || side;
    const entryOrientation = resolveOrientationForMode(entrySide, mode);
    const moveLabel = `${entry.ply.moveNumber}${entry.ply.color === 'white' ? '.' : '...'} ${escapeHtml(entry.ply.san)}`;
    const coverage = entry.evaluation?.coverage != null
      ? `Couverture GM ${Math.round((entry.evaluation.coverage || 0) * 100)}%`
      : '';
    const totalMasters = entry.evaluation?.total ? `${entry.evaluation.total} parties` : '';
    const recommendation = entry.recommendation || {};
    const recommendationSan = recommendation.san || (Array.isArray(recommendation.pvSan) ? recommendation.pvSan[0] : '');
    const sourceTag = entry.recommendationSource === 'engine'
      ? '<span class="source-tag">Moteur local</span>'
      : '<span class="source-tag">Explorer Lichess</span>';
    const scoreLabel = recommendation.engineScore ? formatScoreLabel(recommendation.engineScore) : null;
    const tokens = sanitizeSanSequence([
      ...(entry.tokensBefore || []),
      ...(Array.isArray(recommendation.pvSan) && recommendation.pvSan.length
        ? recommendation.pvSan
        : recommendationSan
          ? [recommendationSan]
          : []),
    ]);
    const preview = tokens.length
      ? buildPreviewButton(tokens, { orientation: entryOrientation })
      : '';
    const totalVolume = entry.evaluation?.total || 0;
    const gmMoves = totalVolume && Array.isArray(entry.evaluation?.pickedMoves)
      ? entry.evaluation.pickedMoves
        .map((m) => `${escapeHtml(m.san || '')} (${Math.round((m.volume / totalVolume) * 100)}%)`)
        .join(', ')
      : '';

    return `
      <div class="gm-entry">
        <div class="gm-entry-title">${moveLabel} — ${sourceTag}</div>
        <div class="gm-meta">
          ${coverage ? `<span>${coverage}</span>` : ''}
          ${totalMasters ? `<span>· ${totalMasters}</span>` : ''}
          ${gmMoves ? `<span>· Refs GM: ${gmMoves}</span>` : ''}
          ${scoreLabel ? `<span>· Eval ${escapeHtml(scoreLabel)}</span>` : ''}
        </div>
        <div class="gm-reco">
          ${preview}
        </div>
      </div>
    `;
  }).join('');
  return `
      <div class="gm-section">
      <div class="gm-entry-title">Sorties de théorie GM</div>
      ${items}
    </div>
  `;
}

function renderImprovements(stats, { side, mode = state.mode } = {}) {
  const entries = Array.isArray(stats._improvements) ? stats._improvements : [];
  if (!entries.length) return '';
  const orientation = resolveOrientationForMode(side, mode);
  const items = entries.map((entry) => {
    const moveLabel = `${entry.ply.moveNumber}${entry.ply.color === 'white' ? '.' : '...'} ${escapeHtml(entry.ply.san)}`;
    const recommendedSan = entry.recommendation?.san || (Array.isArray(entry.recommendation?.pvSan) ? entry.recommendation.pvSan[0] : '');
    const sourceTag = entry.recommendationSource === 'engine'
      ? '<span class="source-tag">Moteur local</span>'
      : '<span class="source-tag">Explorer Lichess</span>';
    const scoreLabel = entry.recommendation?.engineScore ? formatScoreLabel(entry.recommendation.engineScore) : null;
    const tokens = sanitizeSanSequence([
      ...(entry.tokensBefore || []),
      ...(Array.isArray(entry.recommendation?.pvSan) && entry.recommendation.pvSan.length
        ? entry.recommendation.pvSan
        : recommendedSan ? [recommendedSan] : []),
    ]);
    const preview = tokens.length
      ? buildPreviewButton(tokens, { orientation })
      : '';
    const deltaLabel = `<span class="delta-positive">+${(entry.delta * 100).toFixed(1)}%</span>`;

    return `
      <div class="improvement-entry">
        <div class="improvement-entry-title">${moveLabel} — vous avez joué <strong>${escapeHtml(entry.ourMove?.san || entry.ply.san)}</strong></div>
        <div class="improvement-meta">
          ${sourceTag}
          <span>· Gain attendu ${deltaLabel}</span>
          ${scoreLabel ? `<span>· Eval ${escapeHtml(scoreLabel)}</span>` : ''}
        </div>
        <div class="improvement-reco">
          ${preview}
        </div>
      </div>
    `;
  }).join('');
  return `
    <div class="improvement-section">
      <div class="gm-entry-title">Axes d'amélioration recommandés</div>
      ${items}
    </div>
  `;
}

function displayPlayerInfo(playerData, statsData) {
  const playerInfoDiv = document.getElementById('playerInfo');
  const rapid = statsData?.chess_rapid?.last?.rating ?? 'N/A';
  const blitz = statsData?.chess_blitz?.last?.rating ?? 'N/A';
  const bullet = statsData?.chess_bullet?.last?.rating ?? 'N/A';
  const country = getCountryNameFromUrl(playerData.country);

  playerInfoDiv.innerHTML = `
        <div class="player-info">
          <h2>${escapeHtml(playerData.username || '')}</h2>
          <div class="stats">
            <div class="stat-card"><div class="stat-label">Rapid</div><div class="stat-value">${rapid}</div></div>
            <div class="stat-card"><div class="stat-label">Blitz</div><div class="stat-value">${blitz}</div></div>
            <div class="stat-card"><div class="stat-label">Bullet</div><div class="stat-value">${bullet}</div></div>
            <div class="stat-card"><div class="stat-label">Pays</div><div class="stat-value">${escapeHtml(country)}</div></div>
          </div>
        </div>
      `;
  playerInfoDiv.style.display = 'block';
}

function formatOpeningRow(name, stats, extraHtml = '', side = 'white', mode = state.mode) {
  const winRate = stats.count ? ((stats.wins / stats.count) * 100).toFixed(1) : '0.0';
  const drawRate = stats.count ? ((stats.draws / stats.count) * 100).toFixed(1) : '0.0';
  const lossRate = stats.count ? ((stats.losses / stats.count) * 100).toFixed(1) : '0.0';
  const safeName = escapeHtml(name);
  const selectionSet = getSelectionSet(side);
  const isSelected = selectionSet.has(name);
  const encodedName = escapeHtml(encodeURIComponent(name));
  const badges = [];
  if (stats._gmOutOfBook?.length) badges.push('<span class="badge badge-gm">Hors théorie</span>');
  if (mode === ANALYSIS_MODES.self && stats._improvements?.length) badges.push('<span class="badge badge-improve">Axes +score</span>');
  const badgesHtml = badges.length ? ` ${badges.join(' ')}` : '';
  const labelHtml = `${stats.isTrap ? `<span class="trap-name">${safeName}</span>` : safeName}${badgesHtml}`;
  const tokensForMain = stats._mainTokens || stats._sampleTokens || [];
  const { line: mainLineText, moves: mainMoves } = tokensToLineInfo(tokensForMain, { limit: 30 });
  const orientation = resolveOrientationForMode(side, mode);
  const dataMainMoves = mainMoves?.length
    ? ` data-main-moves="${escapeHtml(mainMoves.join('|'))}"`
    : '';
  const dataMainLine = mainLineText
    ? ` data-main-line="${escapeHtml(mainLineText)}"`
    : '';
  const dataOrientation = ` data-orientation="${orientation}"`;
  const dataName = ` data-opening-name="${escapeHtml(name)}"`;

  return `
        <div class="opening-item"${dataMainMoves}${dataMainLine}${dataOrientation}${dataName}>
          <div class="opening-name">${labelHtml}</div>
          <div class="opening-actions">
            <label class="lichess-select">
              <input
                type="checkbox"
                class="lichess-select-checkbox"
                data-side="${side}"
                data-opening="${encodedName}"
                ${isSelected ? 'checked' : ''}
              />
              Explorer Lichess
            </label>
          </div>
          <div class="opening-stats">
            <span class="opening-stat">📊 ${stats.count} parties</span>
            <span class="opening-stat win-rate">✓ ${winRate}%</span>
            <span class="opening-stat draw-rate">= ${drawRate}%</span>
            <span class="opening-stat loss-rate">✗ ${lossRate}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-win" style="width:${winRate}%"></div>
            <div class="progress-draw" style="width:${drawRate}%"></div>
            <div class="progress-loss" style="width:${lossRate}%"></div>
          </div>
          ${extraHtml}
        </div>
      `;
}

function buildOpeningSections(name, stats, side, mode = state.mode) {
  const sections = [];
  const orientation = resolveOrientationForMode(side, mode);
  const mainLine = renderMainLine(stats._mainTokens || stats._sampleTokens || [], orientation);
  if (mainLine) sections.push(mainLine);

  const observed = renderObservedTraps(stats.traps || [], orientation);
  if (observed) sections.push(observed);

  const recs = trapEngine.recommendByOpening(name, side, 3);
  const recsHtml = renderTrapRecommendations(recs, orientation);
  if (recsHtml) sections.push(recsHtml);

  const lichessHtml = renderLichessAdvice(stats, { side, mode });
  if (lichessHtml) sections.push(lichessHtml);

  const gmHtml = renderGmOutOfBook(stats, { side, mode });
  if (gmHtml) sections.push(gmHtml);

  if (mode === ANALYSIS_MODES.self) {
    const improvementHtml = renderImprovements(stats, { side, mode });
    if (improvementHtml) sections.push(improvementHtml);
  }

  return sections.join('');
}

function displayOpenings(whiteOpenings, blackOpenings, mode = state.mode) {
  const whiteDiv = document.getElementById('whiteOpenings');
  const blackDiv = document.getElementById('blackOpenings');

  const sortedWhite = Object.entries(whiteOpenings).sort((a, b) => b[1].count - a[1].count);
  const sortedBlack = Object.entries(blackOpenings).sort((a, b) => b[1].count - a[1].count);

  whiteDiv.innerHTML = sortedWhite.length
    ? sortedWhite.slice(0, 10).map(([name, stats]) => {
      const sections = buildOpeningSections(name, stats, 'white', mode);
      return formatOpeningRow(name, stats, sections, 'white', mode);
    }).join('')
    : '<div class="no-data">Aucune donnée disponible</div>';

  blackDiv.innerHTML = sortedBlack.length
    ? sortedBlack.slice(0, 10).map(([name, stats]) => {
      const sections = buildOpeningSections(name, stats, 'black', mode);
      return formatOpeningRow(name, stats, sections, 'black', mode);
    }).join('')
    : '<div class="no-data">Aucune donnée disponible</div>';

  updateLichessSelectionSummary();
  document.getElementById('openingsSection').style.display = 'grid';
}

function showLoading() {
  document.getElementById('loading').style.display = 'block';
}
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = `❌ Erreur : ${message}`;
  errorDiv.style.display = 'block';
}
function hideError() {
  document.getElementById('error').style.display = 'none';
}

function hideBoardPreview() {
  const boardPreview = document.getElementById('boardPreview');
  if (boardPreview) {
    boardPreview.style.display = 'none';
  }
}

function hideResults() {
  document.getElementById('playerInfo').style.display = 'none';
  document.getElementById('openingsSection').style.display = 'none';
  document.getElementById('prepActions').style.display = 'none';
  hideLichessSelectionControls();
  state.lichessLoading = false;
  state.selectedOpenings = { white: new Set(), black: new Set() };
  clearPendingLichessSelections();
  clearLichessCooldown();
  updateLichessSelectionSummary();
  pinnedAnchor = null;
  hideBoardPreview();
}

function showPrepActions() {
  document.getElementById('prepActions').style.display = 'flex';
}

function topOpenings(openings, limit = 3) {
  return Object.entries(openings || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function buildMarkdown(prep) {
  const lines = [];
  const playerName = prep.player?.username || 'Joueur';
  lines.push(`# Préparation ${playerName}`);
  lines.push('');
  lines.push(`- Mode : ${prep.mode === ANALYSIS_MODES.opponent ? 'Adversaire' : 'Analyse perso'}`);
  lines.push(`- Cadence cible : ${prep.speed}`);
  lines.push(`- Bucket Lichess : ${prep.ratingBucket}`);
  lines.push('');

  const sections = [
    { label: 'Plans contre ses Blancs', items: topOpenings(prep.whiteOpenings) },
    { label: 'Plans contre ses Noirs', items: topOpenings(prep.blackOpenings) },
  ];

  for (const section of sections) {
    if (!section.items.length) continue;
    lines.push(`## ${section.label}`);
    lines.push('');
    for (const [name, stats] of section.items) {
      lines.push(`### ${name} (${stats.count} parties)`);
      const lichessSuggestions = Array.isArray(stats._lichess?.suggestions)
        ? stats._lichess.suggestions.filter(
          (sug) => (sug?.sideExpectedScore || 0) >= LICHESS_MIN_EXPECTED_SCORE
        )
        : [];
      if (lichessSuggestions.length) {
        lines.push('**Coups recommandés :**');
        for (const sug of lichessSuggestions.slice(0, 3)) {
          const score = Math.round((sug.sideExpectedScore || 0) * 100);
          lines.push(`- ${sug.san} · score ${score}% (${sug.total} parties)`);
        }
      } else if (stats._lichess?.suggestions?.length) {
        const thresholdLabel = Math.round(LICHESS_MIN_EXPECTED_SCORE * 100);
        lines.push(`**Coups recommandés :** Aucun coup ≥ ${thresholdLabel}% de score attendu.`);
      }
      if (Array.isArray(stats._gmOutOfBook) && stats._gmOutOfBook.length) {
        lines.push('**Sorties de théorie GM :**');
        for (const gm of stats._gmOutOfBook) {
          const san = gm.recommendation?.san || (gm.recommendation?.pvSan?.[0] || '');
          const coverage = gm.evaluation?.coverage != null ? `${Math.round((gm.evaluation.coverage || 0) * 100)}%` : 'n/a';
          lines.push(`- ${gm.ply.moveNumber}${gm.ply.color === 'white' ? '.' : '...'} ${gm.ply.san} → jouer ${san} (couverture GM ${coverage})`);
        }
      }
      if (Array.isArray(stats._improvements) && stats._improvements.length) {
        lines.push('**Axes d’amélioration :**');
        for (const imp of stats._improvements) {
          const san = imp.recommendation?.san || (imp.recommendation?.pvSan?.[0] || '');
          lines.push(`- ${imp.ply.moveNumber}${imp.ply.color === 'white' ? '.' : '...'} ${imp.ply.san} → préférer ${san} (gain +${(imp.delta * 100).toFixed(1)}%)`);
        }
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function exportPrep(format) {
  const prep = state.latestPrep;
  if (!prep) {
    showError('Aucune analyse à exporter pour le moment');
    return;
  }
  const playerName = prep.player?.username || 'joueur';
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(prep, null, 2)], { type: 'application/json' });
    downloadBlob(`prep-${playerName}.json`, blob);
    return;
  }
  if (format === 'markdown') {
    const markdown = buildMarkdown(prep);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadBlob(`prep-${playerName}.md`, blob);
    return;
  }
  if (format === 'pdf') {
    const markdown = buildMarkdown(prep);
    const win = window.open('', '_blank');
    if (!win) {
      showError('Impossible d\'ouvrir la fenêtre d\'export PDF');
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Préparation ${playerName}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111827; }
            h1 { font-size: 28px; margin-bottom: 16px; }
            h2 { margin-top: 24px; font-size: 22px; }
            h3 { margin-top: 18px; font-size: 18px; }
            ul { margin-left: 20px; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <pre>${markdown.replace(/</g, '&lt;')}</pre>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 250);
  }
}



function initApp() {
  if (window.__COA_INIT_DONE) return;
  window.__COA_INIT_DONE = true;
  console.log('initApp called');
  // ------------ BOARD PREVIEW ------------
  const boardPreview = document.getElementById('boardPreview');
  const boardPreviewBoardEl = document.getElementById('boardPreviewBoard');
  const boardPreviewCaption = document.getElementById('boardPreviewCaption');
  const boardPreviewChessboard = boardPreviewBoardEl
    ? new Chessboard(boardPreviewBoardEl, {
      style: {
        pieces: {
          file: chessboardPiecesUrl,
        },
        showCoordinates: false,
        borderType: BORDER_TYPE.none,
        animationDuration: 0,
      },
    })
    : null;
  if (boardPreviewChessboard) {
    boardPreviewChessboard.setPosition(FEN.empty).catch(() => {});
  }
  let pinnedAnchor = null;

  function setBoardOrientation(boardInstance, orientation) {
    if (!boardInstance || !boardInstance.setOrientation) return;
    const target = orientation === 'black' ? 'black' : 'white';
    try {
      const maybe = boardInstance.setOrientation(target);
      if (maybe?.catch) maybe.catch(() => {});
    } catch (err) {
      console.warn('Failed to set orientation', err);
    }
  }

  function updateBoardPreviewPosition(fen) {
    if (!boardPreviewChessboard) return;
    const targetFen = fen || FEN.empty;
    boardPreviewChessboard
      .setPosition(targetFen)
      .catch(err => {
        console.warn('Failed to set preview FEN', err);
        boardPreviewChessboard.setPosition(FEN.empty).catch(() => {});
      });
  }

  function positionBoardPreview(anchor) {
    const rect = anchor.getBoundingClientRect();
    const boardWidth = boardPreview.offsetWidth || 240;
    const boardHeight = boardPreview.offsetHeight || 260;
    let left = window.scrollX + rect.right + 12;
    let top = window.scrollY + rect.top;

    const viewportRight = window.scrollX + window.innerWidth;
    if (left + boardWidth > viewportRight - 16) {
      left = window.scrollX + rect.left - boardWidth - 12;
    }
    if (left < window.scrollX + 12) left = window.scrollX + 12;

    const viewportBottom = window.scrollY + window.innerHeight;
    if (top + boardHeight > viewportBottom - 16) {
      top = viewportBottom - boardHeight - 16;
    }
    if (top < window.scrollY + 12) top = window.scrollY + 12;

    boardPreview.style.left = `${left}px`;
    boardPreview.style.top = `${top}px`;
  }

  function showBoardPreview(anchor) {
    if (!anchor) return;
    const fen = anchor.dataset.fen || '';
    const line = anchor.dataset.line || '';
    const orientation = anchor.dataset.orientation === 'black' ? 'black' : 'white';
    setBoardOrientation(boardPreviewChessboard, orientation);
    updateBoardPreviewPosition(fen);
    boardPreviewCaption.textContent = line;
    boardPreview.style.display = 'block';
    positionBoardPreview(anchor);
  }

  // ------------ MODAL BOARD ------------
  const lineModal = document.getElementById('lineModal');
  const lineModalTitle = document.getElementById('lineModalTitle');
  const lineModalSummary = document.getElementById('lineModalSummary');
  const lineModalMoves = document.getElementById('lineModalMoves');
  const lineModalLichess = document.getElementById('lineModalLichess');
  const lineModalClose = document.getElementById('lineModalClose');
  const lineModalStart = document.getElementById('lineModalStart');
  const lineModalPrev = document.getElementById('lineModalPrev');
  const lineModalNext = document.getElementById('lineModalNext');
  const lineModalEnd = document.getElementById('lineModalEnd');
  const lineModalBoardEl = document.getElementById('lineModalBoard');
  const lineModalChessboard = lineModalBoardEl
    ? new Chessboard(lineModalBoardEl, {
      style: {
        pieces: {
          file: chessboardPiecesUrl,
        },
        showCoordinates: true,
        borderType: BORDER_TYPE.frame,
      },
    })
    : null;
  if (lineModalChessboard) {
    lineModalChessboard.setPosition(FEN.start).catch(() => {});
  }
  let lineModalMoveButtons = [];
  let lineModalState = {
    tokens: [],
    fens: [FEN.start],
    pgns: [''],
    fullPgn: '',
    index: 0,
    orientation: 'white',
    summary: '',
    title: 'Séquence',
  };

  function parseMovesAttr(value = '') {
    if (!value) return [];
    return value
      .split('|')
      .map(v => v.trim())
      .filter(Boolean);
  }

  function prepareModalState(tokens = []) {
    const chess = new Chess();
    chess.header('Event', 'Chess Openings Analyzer');
    chess.header('Site', 'Local Analysis');
    chess.header('Result', '*');
    const sanitized = [];
    const fens = [chess.fen()];
    const pgns = [''];
    for (const move of tokens) {
      if (!move) continue;
      try {
        const played = chess.move(move, { sloppy: true });
        if (!played) {
          console.warn('Invalid move skipped in modal', move);
          break;
        }
        sanitized.push(move);
        fens.push(chess.fen());
        const currentPgn = chess.pgn({ newline_char: '\n' }).trim();
        pgns.push(currentPgn);
      } catch (err) {
        console.warn('Invalid move skipped in modal', move, err);
        break;
      }
    }
    if (!pgns.length) pgns.push('');
    const fullPgn = pgns[pgns.length - 1] || '';
    return {
      sanitized,
      fens: fens.length ? fens : [FEN.start],
      pgns,
      fullPgn,
    };
  }

  function buildLichessAnalysisUrl({ fen, orientation = 'white', pgn = '', ply = null } = {}) {
    const color = orientation === 'black' ? 'black' : 'white';
    const fragment = Number.isInteger(ply) && ply > 0 ? `#${ply}` : '';
    const normalizedPgn = typeof pgn === 'string' ? pgn.trim() : '';
    if (normalizedPgn) {
      const encodedPgn = encodeURIComponent(normalizedPgn);
      return `https://lichess.org/analysis/pgn/${encodedPgn}?color=${color}${fragment}`;
    }
    let targetFen = fen;
    if (!targetFen) targetFen = FEN.start;
    const encodedFen = String(targetFen)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/ /g, '_');
    return `https://lichess.org/analysis/standard/${encodedFen}?color=${color}${fragment}`;
  }

  function renderModalMoves(tokens = []) {
    if (!lineModalMoves) return;
    const chips = [`<button type="button" class="move-chip" data-ply="0">Début</button>`];
    tokens.forEach((move, idx) => {
      const ply = idx + 1;
      const moveNumber = Math.ceil(ply / 2);
      const isWhite = ply % 2 === 1;
      const label = isWhite
        ? `${moveNumber}. ${move}`
        : `${moveNumber}... ${move}`;
      chips.push(`
        <button type="button" class="move-chip" data-ply="${ply}">
          ${escapeHtml(label)}
        </button>
      `);
    });
    lineModalMoves.innerHTML = chips.join('');
    lineModalMoveButtons = Array.from(lineModalMoves.querySelectorAll('.move-chip'));
  }

  function updateModalControls() {
    if (!lineModalStart || !lineModalPrev || !lineModalNext || !lineModalEnd) return;
    lineModalStart.disabled = lineModalState.index === 0;
    lineModalPrev.disabled = lineModalState.index === 0;
    const atEnd = lineModalState.index >= lineModalState.tokens.length;
    lineModalNext.disabled = atEnd;
    lineModalEnd.disabled = atEnd;
  }

  function updateModalMovesHighlight() {
    if (!lineModalMoveButtons.length) return;
    lineModalMoveButtons.forEach(btn => {
      const ply = Number(btn.dataset.ply || '0');
      btn.classList.toggle('is-active', ply === lineModalState.index);
      btn.classList.toggle('is-past', ply < lineModalState.index);
    });
  }

  function updateLineModal(index) {
    if (!lineModal) return;
    const maxIndex = Math.max(0, lineModalState.fens.length - 1);
    const clamped = Math.max(0, Math.min(index, maxIndex));
    lineModalState.index = clamped;
    const fen = lineModalState.fens[clamped] || FEN.start;
    setBoardOrientation(lineModalChessboard, lineModalState.orientation);
    if (lineModalChessboard) {
      lineModalChessboard.setPosition(fen).catch(() => {});
    }
    const descriptors = [];
    if (lineModalState.summary) descriptors.push(lineModalState.summary);
    if (clamped === 0) {
      descriptors.push('Position initiale');
    } else {
      const demi = clamped;
      const moveWord = demi > 1 ? 'demi-coups' : 'demi-coup';
      descriptors.push(`Après ${demi} ${moveWord}`);
    }
    const side = clamped % 2 === 0 ? 'Trait aux Blancs' : 'Trait aux Noirs';
    descriptors.push(side);
    if (lineModalSummary) lineModalSummary.textContent = descriptors.join(' • ');
    if (lineModalTitle) lineModalTitle.textContent = lineModalState.title || 'Séquence';
    if (lineModalLichess) {
      const fullPgn = lineModalState.fullPgn || '';
      const prefixPgn = Array.isArray(lineModalState.pgns)
        ? lineModalState.pgns[clamped] || ''
        : '';
      const pgnForUrl = fullPgn.trim() || prefixPgn;
      lineModalLichess.href = buildLichessAnalysisUrl({
        fen,
        orientation: lineModalState.orientation,
        pgn: pgnForUrl,
        ply: clamped,
      });
    }
    updateModalControls();
    updateModalMovesHighlight();
  }

  function openLineModal({ tokens, title, summary, orientation }) {
    if (!lineModal) return;
    const prep = prepareModalState(tokens);
    lineModalState = {
      tokens: prep.sanitized,
      fens: prep.fens,
      pgns: prep.pgns,
      fullPgn: prep.fullPgn,
      index: 0,
      orientation: orientation === 'black' ? 'black' : 'white',
      summary: summary || '',
      title: title || 'Séquence',
    };
    renderModalMoves(lineModalState.tokens);
    updateLineModal(0);
    lineModal.classList.add('is-open');
    lineModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    queueMicrotask(() => {
      lineModalClose?.focus?.();
    });
  }

  function closeLineModal() {
    if (!lineModal) return;
    lineModal.classList.remove('is-open');
    lineModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function openLineModalFromElement(element) {
    if (!element) return false;
    const moves = element.dataset.moves || element.dataset.mainMoves;
    const tokens = parseMovesAttr(moves || '');
    if (!tokens.length) return false;
    const orientation = element.dataset.orientation === 'black' ? 'black' : 'white';
    const enclosingOpening = element.closest('.opening-item');
    const openingName = element.dataset.openingName
      || enclosingOpening?.dataset?.openingName
      || 'Séquence';
    const summary = element.dataset.line
      || element.dataset.mainLine
      || enclosingOpening?.dataset?.mainLine
      || '';
    openLineModal({ tokens, title: openingName, summary, orientation });
    return true;
  }

  // ------------ EVENTS ------------

  document.getElementById('username').addEventListener('keydown', e => {
    if (e.key === 'Enter') runAnalysis();
  });
  document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);
  document.getElementById('runLichessBtn').addEventListener('click', runSelectedLichessAnalysis);
  document.getElementById('resumeLichessBtn').addEventListener('click', () => runSelectedLichessAnalysis({ resume: true }));
  document.getElementById('modeOpponent').addEventListener('click', () => setAnalysisMode(ANALYSIS_MODES.opponent));
  document.getElementById('modeSelf').addEventListener('click', () => setAnalysisMode(ANALYSIS_MODES.self));
  document.getElementById('gmMode').addEventListener('change', updateGmOptionVisibility);
  updateGmOptionVisibility();
  setAnalysisMode(state.mode);
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportPrep('json'));
  document.getElementById('exportMarkdownBtn').addEventListener('click', () => exportPrep('markdown'));
  document.getElementById('exportPdfBtn').addEventListener('click', () => exportPrep('pdf'));

  // Aperçu du plateau au survol des boutons de ligne
  document.addEventListener('mouseenter', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('line-preview')) {
      const fen = target.dataset.fen;
      const orientation = target.dataset.orientation;
      if (boardPreview) {
        boardPreview.style.display = 'block';
        positionBoardPreview(target);
        setBoardOrientation(boardPreviewChessboard, orientation);
        updateBoardPreviewPosition(fen);
        pinnedAnchor = target; // mémorise l’anchor courante
      }
    }
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('line-preview')) {
      hideBoardPreview();
    }
  }, true);

  // Ouvre la modale au clic sur une ligne
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('line-preview')) {
      if (openLineModalFromElement(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  // Contrôles de navigation de la modale
  if (lineModalClose) lineModalClose.addEventListener('click', closeLineModal);
  if (lineModalStart) lineModalStart.addEventListener('click', () => updateLineModal(0));
  if (lineModalPrev) lineModalPrev.addEventListener('click', () => {
    const nextIndex = Math.max(0, (lineModalState?.index || 0) - 1);
    updateLineModal(nextIndex);
  });
  if (lineModalNext) lineModalNext.addEventListener('click', () => {
    const max = Math.max(0, ((lineModalState?.fens?.length || 1) - 1));
    const nextIndex = Math.min(max, (lineModalState?.index || 0) + 1);
    updateLineModal(nextIndex);
  });
  if (lineModalEnd) lineModalEnd.addEventListener('click', () => {
    const max = Math.max(0, ((lineModalState?.fens?.length || 1) - 1));
    updateLineModal(max);
  });
  if (lineModalMoves) {
    lineModalMoves.addEventListener('click', (e) => {
      const btn = e.target;
      if (btn && btn.classList && btn.classList.contains('move-chip')) {
        const ply = Number(btn.dataset.ply || '0');
        const targetIndex = Number.isFinite(ply) ? ply : 0;
        updateLineModal(targetIndex);
      }
    });
  }

  // Navigation clavier dans la modale
  document.addEventListener('keydown', (e) => {
    const modalOpen = lineModal && lineModal.classList && lineModal.classList.contains('is-open');
    if (!modalOpen) return;
    const max = Math.max(0, ((lineModalState?.fens?.length || 1) - 1));
    const idx = (lineModalState?.index || 0);
    if (e.key === 'Escape') {
      closeLineModal();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updateLineModal(Math.max(0, idx - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      updateLineModal(Math.min(max, idx + 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      updateLineModal(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      updateLineModal(max);
      return;
    }
  });

  mountDuelModeView('duelModeRoot');
}

// Fournit un export par défaut avec la fonction d'initialisation
export default { init: initApp };
