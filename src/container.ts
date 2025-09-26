import { EngineManager } from './infrastructure/engine/EngineManager';
import { LichessExplorerService } from './infrastructure/lichess/LichessExplorerService';
import { TrapService } from './infrastructure/traps/TrapService';
import { TrapRepository } from './infrastructure/traps/TrapRepository';
import { registerEcoOpenings } from './infrastructure/eco/eco-pack-xl';
import { AnalysisController } from './application/analysis/AnalysisController';
import { DomAnalysisView } from './ui/DomAnalysisView';

export function createAppContainer() {
  const engineManager = new EngineManager();
  const lichessExplorer = new LichessExplorerService();
  const trapRepository = new TrapRepository();
  const trapService = TrapService.fromRepository(trapRepository);
  const ecoOpenings = new Map<string, string>();
  registerEcoOpenings(ecoOpenings, { includeTraps: true });

  const controller = new AnalysisController({
    engineService: engineManager,
    lichessExplorer,
    trapService,
    ecoOpenings,
  });
  const view = new DomAnalysisView();

  return { controller, view };
}
