// @ts-nocheck
import { Chess } from 'chess.js';
import {
  ILichessAdviceService,
  loadPgnCompat,
} from './services/LichessAdviceService';
import { ILichessExplorerClient } from '../../infrastructure/lichess/LichessExplorerClient';
import type { ITrapService } from '../../domain/traps/ITrapService';
import type { IEngineService } from '../../infrastructure/engine/EngineManager';
import { defaultAnalysisState, AnalysisMode } from './state';

function withTimeout(ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
    },
  };
}

const MONTHS_TO_CHECK = 3;
const FETCH_TIMEOUT_MS = 10000;

const FIRST_MOVE_FALLBACK = new Map([
  ['e4', "Ouvertures ouvertes (1.e4)"],
  ['d4', "Ouvertures fermées (1.d4)"],
  ['c4', 'Ouverture Anglaise'],
  ['Nf3', 'Ouverture Réti'],
  ['f4', 'Ouverture Bird'],
  ['b3', 'Ouverture Larsen'],
  ['g3', 'Fianchetto (type Réti/Anglaise)'],
  ['Nc3', 'Ouverture Van Geet'],
  ['e3', "Ouverture Van't Kruijs"],
  ['b4', 'Ouverture Polonaise'],
]);

const DEFAULT_START_FEN = new Chess().fen();
const BLACK_START_FEN = DEFAULT_START_FEN.replace(' w ', ' b ');
const SAN_COMPARE_STRIP = /[+#?!\s\u200B-\u200D\u2060\uFEFF]/g;

function normalizeSanForComparison(rawSan) {
  if (!rawSan) return '';
  return String(rawSan)
    .normalize('NFKC')
    .replace(/[–—−]/g, '-')
    .replace(SAN_COMPARE_STRIP, '')
    .replace(/0/g, 'O')
    .toLowerCase();
}

function playSanMove(chess, san) {
  if (!san) return null;
  const candidate = String(san).trim();
  if (!candidate) return null;
  try {
    const played = chess.move(candidate, { sloppy: true });
    if (played) {
      return played;
    }
  } catch (err) {
    // fall through to comparison-based matching
  }
  const normalizedTarget = normalizeSanForComparison(candidate);
  if (!normalizedTarget) return null;
  const moves = chess.moves({ verbose: true });
  for (const move of moves) {
    const normalizedSan = normalizeSanForComparison(move.san);
    if (normalizedSan && normalizedSan === normalizedTarget) {
      const attempt = { from: move.from, to: move.to };
      if (move.promotion) {
        attempt.promotion = move.promotion;
      }
      return chess.move(attempt);
    }
  }
  return null;
}

function canonicalizeOpeningTokens(
  adviceService,
  tokens = [],
  startTurn = 'white',
  triedBlackFallback = false,
) {
  const sanitized = adviceService.sanitizeSanSequence(tokens);
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
    const played = playSanMove(chess, san);
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
    return canonicalizeOpeningTokens(adviceService, sanitized, 'black', true);
  }
  return cleaned;
}

function normalizeToTokens(adviceService, pgn) {
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
        .map((move) => move?.san || '')
        .filter(Boolean);
      return canonicalizeOpeningTokens(adviceService, history, 'white');
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
  s = s.replace(/[?!]+/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (!s) return [];

  const tokens = s
    .split(' ')
    .filter((tok) =>
      /^[O0]-O(-O)?$/.test(tok) ||
      /^[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?$/.test(tok) ||
      /^[a-h]x?[a-h][1-8](=[QRNB])?$/.test(tok) ||
      /^[a-h][1-8]$/.test(tok) ||
      /^[KQRNB][a-h][1-8]$/.test(tok)
    )
    .map((tok) => tok.replace(/^0-0$/, 'O-O').replace(/^0-0-0$/, 'O-O-O'));

  return canonicalizeOpeningTokens(adviceService, tokens, initialTurn);
}

function getOpeningName(tokens, ecoOpenings) {
  if (!tokens.length) return 'Ouverture inconnue';
  const MAX_PLIES = Math.min(tokens.length, 20);
  for (let plies = MAX_PLIES; plies >= 2; plies--) {
    const prefix = tokens.slice(0, plies).join(' ');
    if (ecoOpenings.has(prefix)) return ecoOpenings.get(prefix);
    for (const [pattern, name] of ecoOpenings.entries()) {
      if (prefix === pattern || prefix.startsWith(pattern + ' ')) return name;
    }
  }
  const first = tokens[0];
  if (FIRST_MOVE_FALLBACK.has(first)) return FIRST_MOVE_FALLBACK.get(first);
  if (first === 'O-O' || first === 'O-O-O') return 'Ouverture avec roque rapide';
  return 'Ouverture inconnue';
}

function sideToMoveAfter(tokens) {
  return tokens.length % 2 === 0 ? 'white' : 'black';
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
    const { signal: monthSignal, cleanup: cleanupMonth } = withTimeout(FETCH_TIMEOUT_MS);
    return fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${y}/${m}`, { signal: monthSignal })
      .then((r) => {
        cleanupMonth();
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
    };
  }
  return collection[name];
}

function aggregateOpenings(games, username, trapService, ecoOpenings, adviceService) {
  const lower = String(username || '').toLowerCase();
  const whiteOpenings = {};
  const blackOpenings = {};

  for (const game of games) {
    if (!game?.pgn) continue;
    const youAreWhite =
      game.white &&
      game.white.username &&
      String(game.white.username).toLowerCase() === lower;
    const tokens = normalizeToTokens(adviceService, game.pgn).slice(0, 20);
    const openingName = getOpeningName(tokens, ecoOpenings);
    const targetOpenings = youAreWhite ? whiteOpenings : blackOpenings;
    const bucket = ensureOpeningBucket(targetOpenings, openingName);

    if (!bucket._sampleTokens && tokens.length) bucket._sampleTokens = tokens;
    if (!bucket._samplePgn && game.pgn) bucket._samplePgn = game.pgn;

    bucket.count += 1;
    const whiteResult = game.white?.result;
    const blackResult = game.black?.result;
    let result = 'draw';
    if (whiteResult === 'win') result = youAreWhite ? 'win' : 'loss';
    else if (blackResult === 'win') result = youAreWhite ? 'loss' : 'win';
    else if (whiteResult === 'timeout' && blackResult === 'win') result = youAreWhite ? 'loss' : 'win';
    else if (blackResult === 'timeout' && whiteResult === 'win') result = youAreWhite ? 'win' : 'loss';

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

    const trapScan = trapService.matchPgn(game.pgn, {
      openingLabel: openingName,
      side: youAreWhite ? 'white' : 'black',
      maxPlies: 24,
    }) || { hits: [] };
    const hits = Array.isArray(trapScan?.hits) ? trapScan.hits : [];
    if (hits.length) {
      bucket.traps.push(...hits.slice(0, 2));
      bucket.isTrap = true;
    }
  }

  return { whiteOpenings, blackOpenings };
}

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

async function enrichWithLichessSuggestions(
  openingsObject,
  playerElo,
  chesscomStats,
  config,
  trapService,
  adviceService,
) {
  const entries = Object.entries(openingsObject);
  const speed = determineTargetSpeed(chesscomStats, config.speedOverride);
  const ratingBucket = adviceService.pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });

  const topEntries = entries.sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const tasks = topEntries.map(async ([name, stats]) => {
    const sampleTokens = stats._sampleTokens || null;
    if (!sampleTokens?.length) return;
    try {
      const trait = sideToMoveAfter(sampleTokens);
      const out = await adviceService.adviseFromTokens({
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
      }
    } catch (err) {
      console.warn('Explorer Lichess en échec pour', name, err?.status || '', err?.url || '', err);
    }
  });

  await Promise.allSettled(tasks);
  return { speed, ratingBucket };
}

async function annotateWithGmTheory(
  openingsObject,
  { playerColor, config, ratingBucket, speed },
  engine,
  adviceService,
  explorerClient,
) {
  const gmConfig = {
    gmMode: config.gmMode,
    gmTopK: config.gmTopK,
    coverageThreshold: config.gmCoverage,
    minMasterGames: config.minMasterGames,
  };
  const entries = Object.entries(openingsObject)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);
  const ourSide = playerColor === 'white' ? 'black' : 'white';
  let gmRateLimited = false;

  for (const [name, stats] of entries) {
    if (gmRateLimited) {
      stats._gmError = describeGmError({ status: 429 });
      continue;
    }
    if (!stats._samplePgn) continue;
    const tokens = Array.isArray(stats._sampleTokens)
      ? stats._sampleTokens
      : normalizeToTokens(adviceService, stats._samplePgn).slice(0, 24);
    delete stats._gmError;
    try {
      const gmHits = await adviceService.detectGmDeviationsFromPgn({
        pgn: stats._samplePgn,
        playerColor,
        limitPlies: 32,
        gmConfig,
      });
      const outOfBook = [];
      for (const item of gmHits) {
        const evaluation = item?.evaluation;
        if (!evaluation?.considered || evaluation.inBook !== false) continue;
        const tokensBefore = tokens.slice(0, item.ply.ply);
        let recommendation = null;
        let alternatives = [];
        let recommendationSource = 'lichess';

        try {
          const data = await explorerClient.fetchExplorer({
            fen: item.ply.fenAfter,
            speeds: [speed],
            ratings: [ratingBucket],
          });
          const moves = adviceService.scoreMoves(data, ourSide).slice(0, 3);
          if (moves.length) {
            recommendation = moves[0];
            alternatives = moves;
          }
        } catch (err) {
          console.warn('Explorer suggestions indisponibles pour réponse GM', err?.status || '', err?.url || '', err);
        }

        if ((!recommendation || recommendation.total < 10) && config.engine?.enabled) {
          const engineResult = await engine.evaluateFen(item.ply.fenAfter, {
            depth: config.engine.depth,
            multipv: config.engine.multipv,
          });
          if (engineResult?.lines?.length) {
            const primary = engineResult.lines[0];
            if (primary?.pvSan?.length) {
              const sanitizedPv = adviceService.sanitizeSanSequence(primary.pvSan);
              recommendation = {
                san: sanitizedPv[0] || primary.pvSan[0],
                uci: primary.pvUci?.[0] || engineResult.bestmove,
                engineScore: primary.score,
                pvSan: sanitizedPv,
                pvUci: primary.pvUci,
              };
              alternatives = engineResult.lines.map((line) => {
                const sanLine = adviceService.sanitizeSanSequence(line.pvSan);
                return {
                  san: sanLine[0] || line.pvSan[0],
                  uci: line.pvUci?.[0],
                  engineScore: line.score,
                  pvSan: sanLine,
                  pvUci: line.pvUci,
                };
              });
              recommendationSource = 'engine';
            }
          }
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
      if (err?.status === 429) {
        gmRateLimited = true;
      }
    }
  }
}

async function computeImprovementPlans(
  openingsObject,
  {
    playerColor,
    ratingBucket,
    speed,
    threshold = 0.08,
    engineConfig = {},
  },
  engine,
  adviceService,
  explorerClient,
) {
  const entries = Object.entries(openingsObject)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  for (const [name, stats] of entries) {
    if (!stats._samplePgn) continue;
    const tokens = Array.isArray(stats._sampleTokens)
      ? stats._sampleTokens
      : normalizeToTokens(adviceService, stats._samplePgn).slice(0, 28);
    const plies = adviceService.extractPliesFromPgn(stats._samplePgn, 32).filter(
      (ply) => ply.color === playerColor
    );
    const improvements = [];
    for (const ply of plies) {
      try {
        const data = await explorerClient.fetchExplorer({
          fen: ply.fenBefore,
          speeds: [speed],
          ratings: [ratingBucket],
        });
        const moves = adviceService.scoreMoves(data, playerColor).slice(0, 5);
        if (!moves.length) continue;
        const ourMove = moves.find((m) => m.uci === ply.uci);
        const best = moves[0];
        if (!best) continue;
        const ourScore = ourMove ? ourMove.sideExpectedScore : 0;
        const delta = best.sideExpectedScore - ourScore;
        let recommendation = best;
        let alternatives = moves;
        let recommendationSource = 'lichess';

        if ((moves[0]?.total || 0) < 10 && engineConfig.enabled) {
          const engineResult = await engine.evaluateFen(ply.fenBefore, {
            depth: engineConfig.depth,
            multipv: engineConfig.multipv,
          });
          if (engineResult?.lines?.length) {
            const primary = engineResult.lines[0];
            if (primary?.pvSan?.length) {
              const sanitizedPv = adviceService.sanitizeSanSequence(primary.pvSan);
              recommendation = {
                san: sanitizedPv[0] || primary.pvSan[0],
                uci: primary.pvUci?.[0] || engineResult.bestmove,
                engineScore: primary.score,
                pvSan: sanitizedPv,
                pvUci: primary.pvUci,
              };
              alternatives = engineResult.lines.map((line) => {
                const sanLine = adviceService.sanitizeSanSequence(line.pvSan);
                return {
                  san: sanLine[0] || line.pvSan[0],
                  uci: line.pvUci?.[0],
                  engineScore: line.score,
                  pvSan: sanLine,
                  pvUci: line.pvUci,
                };
              });
              recommendationSource = 'engine';
            }
          }
        }

        if (delta < threshold && recommendationSource !== 'engine') continue;

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




interface AnalysisControllerDeps {
  engineService: IEngineService;
  lichessExplorer: ILichessExplorerClient;
  lichessAdvice: ILichessAdviceService;
  trapService: ITrapService;
  ecoOpenings: Map<string, string>;
}

export class AnalysisController {
  constructor({ engineService, lichessExplorer, lichessAdvice, trapService, ecoOpenings }: AnalysisControllerDeps) {
    this.engine = engineService;
    this.lichessExplorer = lichessExplorer;
    this.lichessAdvice = lichessAdvice;
    this.traps = trapService;
    this.ecoOpenings = ecoOpenings;
    this.state = { ...defaultAnalysisState };
  }

  getState() {
    return this.state;
  }

  setMode(mode: AnalysisMode) {
    this.state.mode = mode;
    this.state.latestPrep = null;
    this.state.latestPlayer = null;
  }

  async analyze(username, config) {
    if (!username) {
      throw new Error('Veuillez entrer un pseudo Chess.com');
    }

    this.state.config = config;

    if (config.engine?.enabled) {
      if (!config.engine.path) {
        throw new Error('Veuillez fournir le chemin du worker Stockfish.');
      }
      await this.engine.configure(config.engine);
    } else {
      this.engine.dispose();
    }

    const { playerData, statsData, games } = await fetchPlayerContext(username);
    const { whiteOpenings, blackOpenings } = aggregateOpenings(
      games,
      username,
      this.traps,
      this.ecoOpenings,
      this.lichessAdvice,
    );

    const playerElo = computePlayerRating(statsData);
    const whiteMeta = await enrichWithLichessSuggestions(
      whiteOpenings,
      playerElo,
      statsData,
      config,
      this.traps,
      this.lichessAdvice,
    );
    const blackMeta = await enrichWithLichessSuggestions(
      blackOpenings,
      playerElo,
      statsData,
      config,
      this.traps,
      this.lichessAdvice,
    );

    this.state.speed = whiteMeta?.speed || blackMeta?.speed || determineTargetSpeed(statsData, config.speedOverride);
    this.state.ratingBucket =
      whiteMeta?.ratingBucket ||
      blackMeta?.ratingBucket ||
      this.lichessAdvice.pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });

    if (this.state.mode === AnalysisMode.Opponent) {
      await annotateWithGmTheory(
        whiteOpenings,
        {
          playerColor: 'white',
          config,
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
      await annotateWithGmTheory(
        blackOpenings,
        {
          playerColor: 'black',
          config,
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
    } else {
      await annotateWithGmTheory(
        whiteOpenings,
        {
          playerColor: 'white',
          config,
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
      await annotateWithGmTheory(
        blackOpenings,
        {
          playerColor: 'black',
          config,
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
      await computeImprovementPlans(
        whiteOpenings,
        {
          playerColor: 'white',
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
          threshold: 0.08,
          engineConfig: config.engine,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
      await computeImprovementPlans(
        blackOpenings,
        {
          playerColor: 'black',
          ratingBucket: this.state.ratingBucket,
          speed: this.state.speed,
          threshold: 0.08,
          engineConfig: config.engine,
        },
        this.engine,
        this.lichessAdvice,
        this.lichessExplorer,
      );
    }

    this.state.latestPrep = {
      mode: this.state.mode,
      player: playerData,
      openings: {
        white: whiteOpenings,
        black: blackOpenings,
      },
      metadata: {
        ratingBucket: this.state.ratingBucket,
        speed: this.state.speed,
        engineConfig: config.engine,
      },
    };
    this.state.latestPlayer = playerData;

    return {
      player: playerData,
      stats: statsData,
      whiteOpenings,
      blackOpenings,
      speed: this.state.speed,
      ratingBucket: this.state.ratingBucket,
    };
  }
}
