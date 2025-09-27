import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisController, normalizeToTokens } from '../src/application/analysis/AnalysisController';
import { AnalysisMode } from '../src/application/analysis/state';
import { LichessAdviceService } from '../src/application/analysis/services/LichessAdviceService';

function createAdviceService() {
  const explorerClient = { fetchExplorer: vi.fn() };
  const mastersClient = {
    fetchMasters: vi.fn().mockResolvedValue({ moves: [] }),
    evaluateMoveAgainstGm: vi.fn().mockReturnValue({ considered: false, inBook: null }),
  } as any;
  return new LichessAdviceService(explorerClient as any, mastersClient);
}

describe('normalizeToTokens', () => {
  it('parses PGNs with figurines, quotes, and ellipses', () => {
    const adviceService = createAdviceService();
    const pgn = `[Event "Rated"]
[Site "https://example.com"]
[White "Player"]
[Black "Opponent"]
[Result "*"]

1. “e4?!” e5 2. ♘f3 Nc6 3. Bb5⁇ 3… a6 4. O-O!? Nf6 *
`;
    const tokens = normalizeToTokens(adviceService, pgn);
    expect(tokens).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O', 'Nf6']);
  });
});

function createResponse(payload: any, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

describe('AnalysisController', () => {
  const adviceService = createAdviceService();
  const engineService = {
    configure: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    evaluateFen: vi.fn().mockResolvedValue(null),
  };

  const trapService = {
    matchPgn: vi.fn().mockReturnValue({ hits: [] }),
    matchTokens: vi.fn().mockReturnValue({ hits: [] }),
    recommendByOpening: vi.fn().mockReturnValue([]),
  };

  const ecoOpenings = new Map<string, string>([
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'].join(' '), 'Espagnole'],
  ]);

  const lichessExplorer = {
    fetchExplorer: vi.fn().mockResolvedValue({ moves: [], white: 0, draws: 0, black: 0 }),
  };

  const lichessAdvice = {
    pickLichessBucket: vi.fn().mockReturnValue(1600),
    mapSpeed: vi.fn().mockReturnValue('blitz'),
    sanitizeSanSequence: vi.fn((seq = []) => adviceService.sanitizeSanSequence(seq)),
    scoreMoves: vi.fn().mockReturnValue([]),
    adviseFromTokens: vi.fn().mockResolvedValue({
      openingName: null,
      eco: null,
      totals: { white: 0, draws: 0, black: 0 },
      suggestions: [],
      raw: { moves: [], white: 0, draws: 0, black: 0 },
      fen: 'startpos',
      ratingBucket: 1600,
      speed: 'blitz',
    }),
    adviseFromPgn: vi.fn(),
    pgnToFenAndUci: vi.fn(),
    extractPliesFromPgn: vi.fn().mockReturnValue([]),
    detectGmDeviationsFromPgn: vi.fn().mockResolvedValue([]),
  } as any;

  const playerData = { username: 'TestUser' };
  const statsData = {
    chess_blitz: { last: { rating: 1800 } },
  };
  const sampleGame = {
    pgn: '1. e4⁉ e5 2. ♘f3 Nc6 3. Bb5+ a6',
    white: { username: 'TestUser', result: 'win' },
    black: { username: 'Opponent', result: 'resign' },
    end_time: 0,
    url: 'https://example.com',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve(createResponse(statsData));
      }
      if (url.includes('/games/')) {
        return Promise.resolve(createResponse({ games: [sampleGame] }));
      }
      return Promise.resolve(createResponse(playerData));
    });
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('aggregates openings and updates state', async () => {
    const controller = new AnalysisController({
      engineService: engineService as any,
      lichessExplorer: lichessExplorer as any,
      lichessAdvice,
      trapService: trapService as any,
      ecoOpenings,
    });

    controller.setMode(AnalysisMode.Opponent);
    const result = await controller.analyze('TestUser', {
      speedOverride: 'auto',
      ratingOffset: 0,
      gmMode: 'disabled',
      gmTopK: 3,
      gmCoverage: 0.7,
      minMasterGames: 50,
      engine: { enabled: false, path: '', depth: 18, multipv: 3 },
    });

    expect(result.player).toEqual(playerData);
    expect(Object.keys(result.whiteOpenings)).toContain('Espagnole');
    expect(controller.getState().latestPrep).not.toBeNull();
    expect(engineService.configure).not.toHaveBeenCalled();
  });

  it('throws when engine enabled without path', async () => {
    const controller = new AnalysisController({
      engineService: engineService as any,
      lichessExplorer: lichessExplorer as any,
      lichessAdvice,
      trapService: trapService as any,
      ecoOpenings,
    });

    await expect(
      controller.analyze('TestUser', {
        speedOverride: 'auto',
        ratingOffset: 0,
        gmMode: 'disabled',
        gmTopK: 3,
        gmCoverage: 0.7,
        minMasterGames: 50,
        engine: { enabled: true, path: '', depth: 18, multipv: 3 },
      }),
    ).rejects.toThrow();
  });
});
