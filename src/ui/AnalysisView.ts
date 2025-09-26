import type { AnalysisController } from '../application/analysis/AnalysisController';

export interface AnalysisView {
  initialize(controller: AnalysisController): void;
}
