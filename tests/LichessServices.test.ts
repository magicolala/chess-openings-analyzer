import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LichessExplorerClient } from '../src/infrastructure/lichess/LichessExplorerClient';
import { ExplorerCache } from '../src/infrastructure/lichess/ExplorerCache';
import { LichessAdviceService } from '../src/application/analysis/services/LichessAdviceService';

describe('Lichess infrastructure clients', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('caches explorer responses by FEN', async () => {
    const sampleResponse = {
      moves: [],
      white: 10,
      draws: 5,
      black: 3,
    } as any;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleResponse,
    } as Response);
    (global as any).fetch = fetchMock;

    const client = new LichessExplorerClient(new ExplorerCache<any>('test'));
    const params = { fen: 'start', speeds: ['blitz'], ratings: [1600] } as any;
    const first = await client.fetchExplorerByFen(params);
    const second = await client.fetchExplorerByFen(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

  });
});

describe('LichessAdviceService', () => {
  it('computes advice from explorer data', async () => {
    const explorerData = {
      moves: [
        { san: 'e4', uci: 'e2e4', white: 80, draws: 10, black: 10 },
        { san: 'd4', uci: 'd2d4', white: 50, draws: 20, black: 30 },
      ],
      opening: { name: 'King Pawn', eco: 'C20' },
      white: 100,
      draws: 30,
      black: 20,
    } as any;

    const explorerClient = {
      fetchExplorer: vi.fn().mockResolvedValue(explorerData),
    };

    const mastersClient = {
      fetchMasters: vi.fn(),
      evaluateMoveAgainstGm: vi.fn(),
    } as any;

    const service = new LichessAdviceService(explorerClient as any, mastersClient);

    const advice = await service.adviseFromTokens({
      tokens: [],
      sideToMove: 'white',
      playerRating: 1800,
      top: 1,
    });

    expect(explorerClient.fetchExplorer).toHaveBeenCalledTimes(1);
    expect(advice.suggestions).toHaveLength(1);
    expect(advice.suggestions[0].san).toBe('e4');
    expect(advice.openingName).toBe('King Pawn');
  });

  it('requests masters data for GM deviations', async () => {
    const explorerClient = {
      fetchExplorer: vi.fn().mockResolvedValue({ moves: [], white: 0, draws: 0, black: 0 }),
    };

    const mastersClient = {
      fetchMasters: vi.fn().mockResolvedValue({ moves: [] }),
      evaluateMoveAgainstGm: vi.fn().mockReturnValue({ considered: false, inBook: null }),
    } as any;

    const service = new LichessAdviceService(explorerClient as any, mastersClient);

    const deviations = await service.detectGmDeviationsFromPgn({
      pgn: '1. e4 e5 2. Nf3 Nc6',
      playerColor: 'white',
      limitPlies: 4,
    });

    expect(mastersClient.fetchMasters).toHaveBeenCalled();
    expect(deviations.length).toBeGreaterThan(0);
  });
});
