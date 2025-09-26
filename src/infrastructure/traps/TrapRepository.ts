import { TrapEngine } from '../../domain/traps/TrapEngine';
import { Trap } from '../../domain/traps/Trap';
import { trapPack } from '../../domain/traps/packs/trapPack';
import { ultraPack } from '../../domain/traps/packs/ultraPack';

export interface ITrapRepository {
  createEngine(): TrapEngine;
  getAll(): readonly Trap[];
}

export class TrapRepository implements ITrapRepository {
  private readonly sources: readonly (readonly Trap[])[];

  constructor(sources: readonly (readonly Trap[])[] = [trapPack, ultraPack]) {
    this.sources = sources;
  }

  getAll(): readonly Trap[] {
    return this.sources.flat();
  }

  createEngine(): TrapEngine {
    const engine = new TrapEngine();
    for (const traps of this.sources) {
      engine.register(traps);
    }
    return engine;
  }
}
