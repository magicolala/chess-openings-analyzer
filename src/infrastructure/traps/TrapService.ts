import { TrapMatchOptions, TrapMatchResult, TrapEngine } from '../../domain/traps/TrapEngine';
import { TrapRecommendation, TrapSide } from '../../domain/traps/Trap';
import { ITrapService } from '../../domain/traps/ITrapService';
import { ITrapRepository, TrapRepository } from './TrapRepository';

export class TrapService implements ITrapService {
  private readonly engine: TrapEngine;

  constructor(engine: TrapEngine) {
    this.engine = engine;
  }

  static fromRepository(repository: ITrapRepository = new TrapRepository()): TrapService {
    return new TrapService(repository.createEngine());
  }

  matchPgn(pgn: string, options?: TrapMatchOptions): TrapMatchResult {
    return this.engine.matchPgn(pgn, options);
  }

  matchTokens(tokens: readonly string[], options?: TrapMatchOptions): TrapMatchResult {
    return this.engine.matchTokens(tokens, options);
  }

  recommendByOpening(
    openingName: string,
    side: TrapSide,
    limit = 3,
  ): readonly TrapRecommendation[] {
    return this.engine.recommendByOpening(openingName, side, limit);
  }
}
