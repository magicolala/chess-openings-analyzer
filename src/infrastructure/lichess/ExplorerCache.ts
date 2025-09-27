export type ExplorerCacheKind = 'fen' | 'play' | 'masters';

export interface ExplorerCacheParams {
  fen?: string;
  uciMoves?: string[];
  speeds?: string[];
  ratings?: number[];
  variant?: string;
}

export class ExplorerCache<T> {
  private readonly store = new Map<string, T>();

  constructor(private readonly prefix: string) {}

  get(kind: ExplorerCacheKind, params: ExplorerCacheParams): T | undefined {
    return this.store.get(this.buildKey(kind, params));
  }

  set(kind: ExplorerCacheKind, params: ExplorerCacheParams, value: T): void {
    this.store.set(this.buildKey(kind, params), value);
  }

  has(kind: ExplorerCacheKind, params: ExplorerCacheParams): boolean {
    return this.store.has(this.buildKey(kind, params));
  }

  clear(): void {
    this.store.clear();
  }

  private buildKey(kind: ExplorerCacheKind, params: ExplorerCacheParams): string {
    const { fen = '', uciMoves = [], speeds = [], ratings = [], variant = 'standard' } = params || {};
    const movesKey = Array.isArray(uciMoves) ? uciMoves.join(',') : '';
    const speedsKey = Array.isArray(speeds) ? speeds.join(',') : '';
    const ratingsKey = Array.isArray(ratings) ? ratings.join(',') : '';
    return [this.prefix, kind, variant, fen, movesKey, speedsKey, ratingsKey].join('|');
  }
}
