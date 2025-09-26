import { EngineManager } from './infrastructure/engine/EngineManager';
import { LichessExplorerService } from './infrastructure/lichess/LichessExplorerService';
import { TrapService } from './infrastructure/traps/TrapService';
import { registerEcoOpenings } from './infrastructure/eco/eco-pack-xl';
import { AnalysisController } from './application/analysis/AnalysisController';
import { DomAnalysisView } from './ui/DomAnalysisView';

export function createAppContainer() {
  const engineManager = new EngineManager();
  const lichessExplorer = new LichessExplorerService();
  const trapService = new TrapService();
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
