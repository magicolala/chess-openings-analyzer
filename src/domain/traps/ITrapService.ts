import { TrapMatchResult, TrapMatchOptions } from './TrapEngine';
import { TrapRecommendation, TrapSide } from './Trap';

export interface ITrapService {
  matchPgn(pgn: string, options?: TrapMatchOptions): TrapMatchResult;
  matchTokens(tokens: readonly string[], options?: TrapMatchOptions): TrapMatchResult;
  recommendByOpening(
    openingName: string,
    side: TrapSide,
    limit?: number,
  ): readonly TrapRecommendation[];
}
