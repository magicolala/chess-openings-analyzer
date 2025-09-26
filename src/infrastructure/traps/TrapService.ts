import { TrapEngine, TRAP_PACK } from './TrapEngine';
import { ULTRA_TRAPS } from './trap-pack-ultra';

export class TrapService {
  private readonly engine: TrapEngine;

  constructor(engine: TrapEngine = new TrapEngine()) {
    this.engine = engine;
    this.registerDefaults();
  }

  registerDefaults(): void {
    this.engine.register([...TRAP_PACK, ...ULTRA_TRAPS]);
  }

  matchPgn(pgn: string, options?: Record<string, unknown>) {
    return this.engine.matchPgn(pgn, options);
  }

  matchTokens(tokens: string[], options?: Record<string, unknown>) {
    return this.engine.matchTokens(tokens, options);
  }

  recommendByOpening(openingName: string, side: 'white' | 'black', limit = 3) {
    return this.engine.recommendByOpening(openingName, side, limit);
  }
}
