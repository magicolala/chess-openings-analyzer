import {
  adviseFromLichess,
  detectGmDeviationsFromPgn,
  extractPliesFromPgn,
  fetchExplorer,
  pickLichessBucket,
  scoreMoves,
} from '../../lichess-explorer.js';

const MONTHS_TO_CHECK = 3;
const FETCH_TIMEOUT_MS = 10000;

function pickSpeedFromChesscom(statsData) {
  const order = ['chess_blitz', 'chess_rapid', 'chess_bullet'];
  for (const key of order) {
    if (statsData?.[key]?.last?.rating) {
      const map = { chess_blitz: 'blitz', chess_rapid: 'rapid', chess_bullet: 'bullet' };
      return map[key];
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

function withTimeout(ms, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  const timeoutId = setTimeout(() => ctrl.abort(), ms);
  const cleanup = () => clearTimeout(timeoutId);
  return { signal: ctrl.signal, cleanup };
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

function sideToMoveAfter(tokens) {
  return tokens.length % 2 === 0 ? 'white' : 'black';
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

export async function fetchPlayerContext(username) {
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

export function aggregateOpenings(
  games,
  username,
  { trapEngine, normalizeToTokens, getOpeningName } = {},
) {
  const lower = String(username || '').toLowerCase();
  const whiteOpenings = {};
  const blackOpenings = {};

  for (const game of games || []) {
    if (!game?.pgn) continue;
    const youAreWhite =
      game.white &&
      game.white.username &&
      String(game.white.username).toLowerCase() === lower;
    const tokens = normalizeToTokens ? normalizeToTokens(game.pgn).slice(0, 20) : [];
    const openingName = getOpeningName ? getOpeningName(tokens) : 'Ouverture inconnue';
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

    if (trapEngine?.matchPgn) {
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
  }

  return { whiteOpenings, blackOpenings };
}

export async function enrichWithLichessSuggestions(
  openingsObject,
  playerElo,
  chesscomStats,
  config = {},
  { sideToMove = sideToMoveAfter, determineTargetSpeed: determineSpeedFn = determineTargetSpeed } = {},
) {
  const entries = Object.entries(openingsObject || {});
  const speed = determineSpeedFn(chesscomStats, config.speedOverride);
  const ratingBucket = pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });

  const topEntries = entries.sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const tasks = topEntries.map(async ([name, stats]) => {
    const sampleTokens = stats._sampleTokens || null;
    if (!sampleTokens?.length) return;
    try {
      const trait = sideToMove(sampleTokens);
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
      }
    } catch (err) {
      console.warn('Explorer Lichess en échec pour', name, err?.status || '', err?.url || '', err);
    }
  });

  await Promise.allSettled(tasks);
  return { speed, ratingBucket };
}

export async function annotateWithGmTheory(
  openingsObject,
  {
    playerColor,
    config = {},
    ratingBucket,
    speed,
    engineManager,
    normalizeToTokens,
    sanitizeSanSequence,
  },
) {
  const gmConfig = {
    gmMode: config.gmMode,
    gmTopK: config.gmTopK,
    coverageThreshold: config.gmCoverage,
    minMasterGames: config.minMasterGames,
  };
  const entries = Object.entries(openingsObject || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);
  const ourSide = playerColor === 'white' ? 'black' : 'white';

  for (const [name, stats] of entries) {
    if (!stats._samplePgn) continue;
    const tokens = Array.isArray(stats._sampleTokens)
      ? stats._sampleTokens
      : normalizeToTokens?.(stats._samplePgn).slice(0, 24);
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
        const tokensBefore = tokens?.slice?.(0, item.ply.ply) || [];
        let recommendation = null;
        let alternatives = [];
        let recommendationSource = 'lichess';

        try {
          const data = await fetchExplorer({
            fen: item.ply.fenAfter,
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

        if ((!recommendation || recommendation.total < 10) && config.engine?.enabled && engineManager) {
          const engineResult = await engineManager.evaluateFen(item.ply.fenAfter, {
            depth: config.engine.depth,
            multipv: config.engine.multipv,
          });
          if (engineResult?.lines?.length) {
            const primary = engineResult.lines[0];
            if (primary?.pvSan?.length) {
              const sanitizedPv = sanitizeSanSequence ? sanitizeSanSequence(primary.pvSan) : primary.pvSan;
              recommendation = {
                san: sanitizedPv[0] || primary.pvSan[0],
                uci: primary.pvUci?.[0] || engineResult.bestmove,
                engineScore: primary.score,
                pvSan: sanitizedPv,
                pvUci: primary.pvUci,
              };
              alternatives = engineResult.lines.map((line) => {
                const sanLine = sanitizeSanSequence ? sanitizeSanSequence(line.pvSan) : line.pvSan;
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
    }
  }
}

export async function computeImprovementPlans(
  openingsObject,
  {
    playerColor,
    ratingBucket,
    speed,
    threshold = 0.08,
    engineConfig = {},
    engineManager,
    sanitizeSanSequence,
  },
) {
  const entries = Object.entries(openingsObject || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  for (const [name, stats] of entries) {
    if (!stats._samplePgn) continue;
    const plies = extractPliesFromPgn(stats._samplePgn, 32).filter(
      (ply) => ply.color === playerColor,
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

        if ((moves[0]?.total || 0) < 10 && engineConfig.enabled && engineManager) {
          const engineResult = await engineManager.evaluateFen(ply.fenBefore, {
            depth: engineConfig.depth,
            multipv: engineConfig.multipv,
          });
          if (engineResult?.lines?.length) {
            const primary = engineResult.lines[0];
            if (primary?.pvSan?.length) {
              const sanitizedPv = sanitizeSanSequence ? sanitizeSanSequence(primary.pvSan) : primary.pvSan;
              recommendation = {
                san: sanitizedPv[0] || primary.pvSan[0],
                uci: primary.pvUci?.[0] || engineResult.bestmove,
                engineScore: primary.score,
                pvSan: sanitizedPv,
                pvUci: primary.pvUci,
              };
              alternatives = engineResult.lines.map((line) => {
                const sanLine = sanitizeSanSequence ? sanitizeSanSequence(line.pvSan) : line.pvSan;
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

        const tokensBefore = stats._sampleTokens?.slice?.(0, Math.max(0, ply.ply - 1)) || [];
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

export async function runAnalysis({
  username,
  config = {},
  engineManager,
  trapEngine,
  mode,
  helpers = {},
}) {
  if (!username) throw new Error('Veuillez entrer un pseudo Chess.com');
  if (!helpers.normalizeToTokens || !helpers.getOpeningName) {
    throw new Error('Configuration analyse incomplète (normalizeToTokens manquant).');
  }

  if (config.engine?.enabled) {
    if (!config.engine.path) {
      throw new Error("Chemin du moteur Stockfish requis pour l'analyse locale");
    }
    await engineManager?.configure({
      enabled: true,
      path: config.engine.path,
      depth: config.engine.depth,
      multipv: config.engine.multipv,
    });
  } else {
    engineManager?.dispose?.();
  }

  const context = await fetchPlayerContext(username);
  const { playerData, statsData, games } = context;
  const { whiteOpenings, blackOpenings } = aggregateOpenings(games, username, {
    trapEngine,
    normalizeToTokens: helpers.normalizeToTokens,
    getOpeningName: helpers.getOpeningName,
  });
  const computeRating = helpers.computePlayerRating || computePlayerRating;
  const determineSpeedFn = helpers.determineTargetSpeed || determineTargetSpeed;
  const playerElo = computeRating(statsData);

  const whiteMeta = await enrichWithLichessSuggestions(
    whiteOpenings,
    playerElo,
    statsData,
    config,
    {
      sideToMove: helpers.sideToMoveAfter || sideToMoveAfter,
      determineTargetSpeed: determineSpeedFn,
    },
  );
  const blackMeta = await enrichWithLichessSuggestions(
    blackOpenings,
    playerElo,
    statsData,
    config,
    {
      sideToMove: helpers.sideToMoveAfter || sideToMoveAfter,
      determineTargetSpeed: determineSpeedFn,
    },
  );

  const fallbackSpeed = determineSpeedFn(statsData, config.speedOverride);
  const speed = whiteMeta?.speed || blackMeta?.speed || fallbackSpeed;
  const ratingBucket =
    whiteMeta?.ratingBucket ||
    blackMeta?.ratingBucket ||
    pickLichessBucket(playerElo, { offset: config.ratingOffset || 0 });

  await annotateWithGmTheory(whiteOpenings, {
    playerColor: 'white',
    config,
    ratingBucket,
    speed,
    engineManager: config.engine?.enabled ? engineManager : null,
    normalizeToTokens: helpers.normalizeToTokens,
    sanitizeSanSequence: helpers.sanitizeSanSequence,
  });
  await annotateWithGmTheory(blackOpenings, {
    playerColor: 'black',
    config,
    ratingBucket,
    speed,
    engineManager: config.engine?.enabled ? engineManager : null,
    normalizeToTokens: helpers.normalizeToTokens,
    sanitizeSanSequence: helpers.sanitizeSanSequence,
  });

  if (mode === 'self') {
    await computeImprovementPlans(whiteOpenings, {
      playerColor: 'white',
      ratingBucket,
      speed,
      threshold: 0.08,
      engineConfig: config.engine,
      engineManager: config.engine?.enabled ? engineManager : null,
      sanitizeSanSequence: helpers.sanitizeSanSequence,
    });
    await computeImprovementPlans(blackOpenings, {
      playerColor: 'black',
      ratingBucket,
      speed,
      threshold: 0.08,
      engineConfig: config.engine,
      engineManager: config.engine?.enabled ? engineManager : null,
      sanitizeSanSequence: helpers.sanitizeSanSequence,
    });
  }

  return {
    context,
    whiteOpenings,
    blackOpenings,
    speed,
    ratingBucket,
    playerElo,
    config,
  };
}
