import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisController } from '../src/application/analysis/AnalysisController';
import { AnalysisMode } from '../src/application/analysis/state';

function createResponse(payload: any, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

describe('AnalysisController', () => {
  const engineService = {
    configure: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    evaluateFen: vi.fn().mockResolvedValue(null),
  };

  const trapService = {
    registerDefaults: vi.fn(),
    matchPgn: vi.fn().mockReturnValue({ hits: [] }),
    matchTokens: vi.fn().mockReturnValue({ hits: [] }),
    recommendByOpening: vi.fn().mockReturnValue([]),
  };

  const ecoOpenings = new Map<string, string>([
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'].join(' '), 'Espagnole'],
  ]);

  const lichessExplorer = {};

  const playerData = { username: 'TestUser' };
  const statsData = {
    chess_blitz: { last: { rating: 1800 } },
  };
  const sampleGame = {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
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
      lichessExplorer,
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
      lichessExplorer,
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
