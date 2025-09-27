import { ExplorerCache } from './ExplorerCache';
import { fetchJson } from './http';

export type SpeedCategory = 'bullet' | 'blitz' | 'rapid' | 'correspondence';

export interface ExplorerRequest {
  fen?: string;
  uciMoves?: string[];
  speeds?: SpeedCategory[];
  ratings?: number[];
  variant?: string;
}

export interface ExplorerMove {
  san: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
  game?: string;
  [key: string]: unknown;
}

export interface ExplorerResponse {
  moves: ExplorerMove[];
  opening?: { eco?: string; name?: string } | null;
  white: number;
  draws: number;
  black: number;
  recentGames?: unknown[];
  [key: string]: unknown;
}

export interface ILichessExplorerClient {
  fetchExplorer(params: ExplorerRequest): Promise<ExplorerResponse>;
  fetchExplorerByFen(params: ExplorerRequest): Promise<ExplorerResponse>;
  fetchExplorerByPlay(params: ExplorerRequest): Promise<ExplorerResponse>;
}

const BASE = 'https://explorer.lichess.ovh/lichess';

export class LichessExplorerClient implements ILichessExplorerClient {
  constructor(private readonly cache = new ExplorerCache<ExplorerResponse>('explorer')) {}

  async fetchExplorer(params: ExplorerRequest): Promise<ExplorerResponse> {
    try {
      return await this.fetchExplorerByFen(params);
    } catch (error) {
      if (params.uciMoves?.length) {
        return this.fetchExplorerByPlay(params);
      }
      throw error;
    }
  }

  async fetchExplorerByFen(params: ExplorerRequest): Promise<ExplorerResponse> {
    if (!params.fen) {
      throw new Error('Missing FEN for explorer request');
    }
    if (this.cache.has('fen', params)) {
      return this.cache.get('fen', params)!;
    }
    const url = this.buildFenUrl(params);
    const data = await fetchJson<ExplorerResponse>(url);
    this.cache.set('fen', params, data);
    return data;
  }

  async fetchExplorerByPlay(params: ExplorerRequest): Promise<ExplorerResponse> {
    if (!params.uciMoves?.length) {
      throw new Error('Missing uciMoves for explorer request');
    }
    if (this.cache.has('play', params)) {
      return this.cache.get('play', params)!;
    }
    const url = this.buildPlayUrl(params);
    const data = await fetchJson<ExplorerResponse>(url);
    this.cache.set('play', params, data);
    return data;
  }

  private buildFenUrl({ fen, speeds = ['blitz'], ratings = [1600], variant = 'standard' }: ExplorerRequest): string {
    const url = new URL(BASE);
    url.searchParams.set('variant', variant);
    url.searchParams.set('fen', String(fen));
    if (speeds?.length) {
      url.searchParams.set('speeds', speeds.join(','));
    }
    if (ratings?.length) {
      url.searchParams.set('ratings', ratings.join(','));
    }
    return url.toString();
  }

  private buildPlayUrl({
    uciMoves = [],
    speeds = ['blitz'],
    ratings = [1600],
    variant = 'standard',
  }: ExplorerRequest): string {
    const url = new URL(BASE);
    url.searchParams.set('variant', variant);
    if (uciMoves.length) {
      url.searchParams.set('play', uciMoves.join(','));
    }
    if (speeds?.length) {
      url.searchParams.set('speeds', speeds.join(','));
    }
    if (ratings?.length) {
      url.searchParams.set('ratings', ratings.join(','));
    }
    return url.toString();
  }
}
