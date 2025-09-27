import { ExplorerCache } from './ExplorerCache';
import { fetchJson } from './http';

export const MASTER_BASE = 'https://explorer.lichess.ovh/master';

export interface LichessMasterMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  [key: string]: unknown;
}

export interface LichessMastersResponse {
  moves: LichessMasterMove[];
  [key: string]: unknown;
}

export interface GmMajorityConfig {
  gmMode?: 'top1' | 'topK' | 'coverage';
  gmTopK?: number;
  coverageThreshold?: number;
  minMasterGames?: number;
}

export interface GmMajorityResult {
  considered: boolean;
  reason?: 'noData' | 'lowVolume';
  total?: number;
  coverage?: number;
  majoritySet?: Set<string>;
  pickedMoves?: Array<{ uci: string; san: string; volume: number; coverage: number }>;
  topMove?: { uci: string; san: string; volume: number; coverage: number } | null;
}

export interface GmEvaluationResult extends GmMajorityResult {
  inBook: boolean | null;
}

export interface ILichessMastersClient {
  fetchMasters(fen: string): Promise<LichessMastersResponse | null>;
  computeGmMajority(
    mastersData: LichessMastersResponse | null,
    config?: GmMajorityConfig,
  ): GmMajorityResult;
  evaluateMoveAgainstGm(
    mastersData: LichessMastersResponse | null,
    playedUci: string,
    config?: GmMajorityConfig,
  ): GmEvaluationResult;
}

function sumMasterMove(move: LichessMasterMove): number {
  return (move.white || 0) + (move.draws || 0) + (move.black || 0);
}

export class LichessMastersClient implements ILichessMastersClient {
  private readonly cache: ExplorerCache<LichessMastersResponse>;

  constructor(cache = new ExplorerCache<LichessMastersResponse>('masters')) {
    this.cache = cache;
  }

  async fetchMasters(fen: string): Promise<LichessMastersResponse | null> {
    const cleanFen = String(fen || '').trim();
    if (!cleanFen) {
      return null;
    }
    if (this.cache.has('masters', { fen: cleanFen })) {
      return this.cache.get('masters', { fen: cleanFen })!;
    }
    const url = new URL(MASTER_BASE);
    url.searchParams.set('fen', cleanFen);
    const data = await fetchJson<LichessMastersResponse>(url.toString(), {
      retries: 3,
      retryDelayMs: 1000,
    });
    this.cache.set('masters', { fen: cleanFen }, data);
    return data;
  }

  computeGmMajority(
    mastersData: LichessMastersResponse | null,
    {
      gmMode = 'top1',
      gmTopK = 1,
      coverageThreshold = 0.7,
      minMasterGames = 50,
    }: GmMajorityConfig = {},
  ): GmMajorityResult {
    if (!mastersData || !Array.isArray(mastersData.moves)) {
      return { considered: false, reason: 'noData' };
    }

    const sorted = [...mastersData.moves].sort((a, b) => sumMasterMove(b) - sumMasterMove(a));
    const total = sorted.reduce((acc, move) => acc + sumMasterMove(move), 0);
    if (total < minMasterGames) {
      return { considered: false, reason: 'lowVolume', total };
    }

    const picked: Array<{ move: LichessMasterMove; coverage: number }> = [];
    if (gmMode === 'coverage') {
      const target = Math.max(0.01, Math.min(1, coverageThreshold));
      let acc = 0;
      for (const move of sorted) {
        const volume = sumMasterMove(move);
        acc += volume;
        picked.push({ move, coverage: acc / total });
        if (acc / total >= target) {
          break;
        }
      }
    } else if (gmMode === 'topK') {
      const limit = Math.max(1, gmTopK | 0);
      for (let i = 0; i < Math.min(limit, sorted.length); i++) {
        const move = sorted[i];
        picked.push({ move, coverage: sumMasterMove(move) / total });
      }
    } else if (sorted.length) {
      const move = sorted[0];
      picked.push({ move, coverage: sumMasterMove(move) / total });
    }

    const majoritySet = new Set(picked.map((entry) => entry.move.uci));
    const coverage = picked.reduce((acc, entry) => acc + sumMasterMove(entry.move), 0) / total;

    return {
      considered: true,
      total,
      coverage,
      majoritySet,
      pickedMoves: picked.map((entry) => ({
        uci: entry.move.uci,
        san: entry.move.san,
        volume: sumMasterMove(entry.move),
        coverage: entry.coverage,
      })),
      topMove: sorted[0]
        ? {
            uci: sorted[0].uci,
            san: sorted[0].san,
            volume: sumMasterMove(sorted[0]),
            coverage: sumMasterMove(sorted[0]) / total,
          }
        : null,
    };
  }

  evaluateMoveAgainstGm(
    mastersData: LichessMastersResponse | null,
    playedUci: string,
    config: GmMajorityConfig = {},
  ): GmEvaluationResult {
    const evaluation = this.computeGmMajority(mastersData, config);
    if (!evaluation.considered) {
      return { ...evaluation, inBook: null };
    }
    const inBook = evaluation.majoritySet?.has(playedUci) ?? false;
    return { ...evaluation, inBook };
  }
}
