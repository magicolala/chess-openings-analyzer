import { EngineManager } from './infrastructure/engine/EngineManager';
import { LichessExplorerClient } from './infrastructure/lichess/LichessExplorerClient';
import { LichessMastersClient } from './infrastructure/lichess/LichessMastersClient';
import { LichessAdviceService } from './application/analysis/services/LichessAdviceService';
import { TrapService } from './infrastructure/traps/TrapService';
import { TrapRepository } from './infrastructure/traps/TrapRepository';
import { registerEcoOpenings } from './infrastructure/eco/eco-pack-xl';
import { AnalysisController } from './application/analysis/AnalysisController';
import { DomAnalysisView } from './ui/DomAnalysisView';

export function createAppContainer() {
  const engineManager = new EngineManager();
  const explorerClient = new LichessExplorerClient();
  const mastersClient = new LichessMastersClient();
  const lichessAdvice = new LichessAdviceService(explorerClient, mastersClient);
  const trapRepository = new TrapRepository();
  const trapService = TrapService.fromRepository(trapRepository);
  const ecoOpenings = new Map<string, string>();
  registerEcoOpenings(ecoOpenings, { includeTraps: true });

  const controller = new AnalysisController({
    engineService: engineManager,
    lichessExplorer: explorerClient,
    lichessAdvice,
    trapService,
    ecoOpenings,
  });
  const view = new DomAnalysisView();

  return { controller, view };
}
