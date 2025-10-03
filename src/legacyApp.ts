import { adviseFromLichess } from './lichess/advisor';
import { createRateLimitQueue } from './infrastructure/rateLimitQueue';
import { analysisStore, AnalysisState, PlayerColor } from './store/analysisStore';
import { pickLichessBucket } from './lichess/rating';
import { mapSpeed } from './lichess/speed';
import { mountDuelModeView } from './features/duel-mode';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - le pack ECO historique est fourni en JavaScript pur.
import { registerEcoOpenings } from '../eco-pack-xl.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - la librairie de pièges est fournie en JavaScript historique.
import { TrapEngine, TRAP_PACK } from '../trap-engine.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - la librairie de pièges est fournie en JavaScript historique.
import { ULTRA_TRAPS } from '../trap-pack-ultra.js';

interface OpeningEntry {
  id: string;
  label: string;
  tokens: string[];
  orientation: PlayerColor;
}

const ECO_OPENINGS = new Map<string, string>([
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'].join(' '), 'Espagnole (Ruy Lopez)'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'].join(' '), 'Italienne (Giuoco Piano)'],
  [['e4', 'e5', 'Nf3', 'Nf6'].join(' '), 'Défense Petrov'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'd4'].join(' '), 'Écossaise'],
  [['e4', 'e5', 'Nf3', 'f5'].join(' '), 'Gambit Letton'],
  [['e4', 'e5', 'f4'].join(' '), 'Gambit du Roi'],
  [['e4', 'e5', 'Nc3'].join(' '), 'Viennoise'],
  [['e4', 'e5', 'Bc4'].join(' '), 'Partie du Fou'],
  [['e4', 'c5'].join(' '), 'Défense Sicilienne'],
  [['e4', 'c5', 'Nf3', 'd6'].join(' '), 'Sicilienne Dragon (setup)'],
  [['e4', 'c5', 'Nf3', 'Nc6'].join(' '), 'Sicilienne Classique'],
  [['e4', 'c5', 'Nf3', 'e6'].join(' '), 'Sicilienne Variante Française'],
  [['e4', 'c5', 'Nf3', 'Nf6'].join(' '), 'Sicilienne Nimzowitsch'],
  [['e4', 'c5', 'c3'].join(' '), 'Sicilienne Alapin'],
  [['e4', 'e6'].join(' '), 'Défense Française'],
  [['e4', 'e6', 'd4', 'd5'].join(' '), 'Française (Var. principale)'],
  [['e4', 'e6', 'd4', 'd5', 'e5'].join(' '), 'Française Avance'],
  [['e4', 'e6', 'd4', 'd5', 'Nc3'].join(' '), 'Française Classique'],
  [['e4', 'e6', 'd4', 'd5', 'exd5'].join(' '), 'Française Échange'],
  [['e4', 'c6'].join(' '), 'Défense Caro-Kann'],
  [['e4', 'c6', 'd4', 'd5'].join(' '), 'Caro-Kann (Var. principale)'],
  [['e4', 'c6', 'd4', 'd5', 'Nc3'].join(' '), 'Caro-Kann Classique'],
  [['e4', 'c6', 'd4', 'd5', 'e5'].join(' '), 'Caro-Kann Avance'],
  [['e4', 'd5'].join(' '), 'Défense Scandinave'],
  [['e4', 'd6'].join(' '), 'Défense Pirc'],
  [['e4', 'Nf6'].join(' '), 'Défense Alekhine'],
  [['e4', 'g6'].join(' '), 'Défense Moderne'],
  [['e4', 'Nc6'].join(' '), 'Défense Nimzowitsch'],
  [['e4', 'a6'].join(' '), 'Défense St. George'],
  [['e4', 'b6'].join(' '), 'Défense Owen'],
  [['d4', 'd5'].join(' '), 'Partie du Pion Dame'],
  [['d4', 'd5', 'c4'].join(' '), 'Gambit Dame'],
  [['d4', 'd5', 'c4', 'dxc4'].join(' '), 'Gambit Dame Accepté'],
  [['d4', 'd5', 'c4', 'e6'].join(' '), 'Gambit Dame Refusé'],
  [['d4', 'd5', 'c4', 'c6'].join(' '), 'Défense Slave'],
  [['d4', 'd5', 'Nf3'].join(' '), 'Système de Londres (ordre flexible)'],
  [['d4', 'd5', 'Bf4'].join(' '), 'Système de Londres (avec Bf4)'],
  [['d4', 'Nf6'].join(' '), 'Défenses Indiennes'],
  [['d4', 'Nf6', 'c4', 'e6'].join(' '), 'Nimzo/Ouest-Indienne (set-up)'],
  [['d4', 'Nf6', 'c4', 'g6'].join(' '), 'Est-Indienne (set-up)'],
  [['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'].join(' '), 'Défense Nimzo-Indienne'],
  [['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'].join(' '), 'Défense Ouest-Indienne'],
  [['d4', 'Nf6', 'c4', 'c5'].join(' '), 'Défense Benoni Moderne'],
  [['d4', 'Nf6', 'Nf3', 'g6'].join(' '), 'Est-Indienne (avec Nf3)'],
  [['d4', 'f5'].join(' '), 'Défense Hollandaise'],
  [['d4', 'e6'].join(' '), 'Française par transposition'],
  [['d4', 'g6'].join(' '), 'Moderne vs d4'],
  [['d4', 'd6'].join(' '), 'Old Indian'],
  [['d4', 'c5'].join(' '), 'Benoni Ancienne'],
  [['c4'].join(' '), 'Ouverture Anglaise'],
  [['c4', 'e5'].join(' '), 'Anglaise Symétrique (réponse e5)'],
  [['c4', 'c5'].join(' '), 'Anglaise Symétrique (Sicilienne inversée)'],
  [['c4', 'Nf6'].join(' '), 'Anglaise avec Nf6'],
  [['c4', 'e6'].join(' '), 'Anglaise avec e6'],
  [['Nf3'].join(' '), 'Ouverture Réti'],
  [['Nf3', 'd5'].join(' '), 'Réti avec d5'],
  [['Nf3', 'Nf6'].join(' '), 'Réti Symétrique'],
  [['Nf3', 'd5', 'c4'].join(' '), 'Gambit Réti'],
  [['f4'].join(' '), 'Ouverture Bird'],
  [['b3'].join(' '), 'Ouverture Larsen'],
  [['g3'].join(' '), 'Ouverture Benko (fianchetto)'],
  [['Nc3'].join(' '), 'Ouverture Van Geet'],
  [['e3'].join(' '), "Ouverture Van't Kruijs"],
  [['b4'].join(' '), 'Ouverture Polonaise'],
]);

registerEcoOpenings(ECO_OPENINGS, { includeTraps: true });

const trapEngine = new TrapEngine();
trapEngine.register([...TRAP_PACK, ...ULTRA_TRAPS]);
void trapEngine;

const lichessQueue = createRateLimitQueue({ intervalMs: 350, maxConcurrent: 1 });

function inferOrientation(tokens: string[]): PlayerColor {
  if (tokens.length % 2 === 0) {
    return 'black';
  }
  return 'white';
}

const OPENING_ENTRIES: OpeningEntry[] = Array.from(ECO_OPENINGS.entries()).map(([sequence, label]) => ({
  id: sequence,
  label,
  tokens: sequence.split(' ').filter(Boolean),
  orientation: inferOrientation(sequence.split(' ').filter(Boolean)),
}));

function updateLoadingState(state: AnalysisState): void {
  const loadingEl = document.getElementById('loading');
  if (!loadingEl) {
    return;
  }
  loadingEl.hidden = !state.lichessLoading;
}

function updateError(message: string | null): void {
  const errorEl = document.getElementById('error');
  if (!errorEl) {
    return;
  }
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

function renderSelectionSummary(state: AnalysisState): void {
  const summaryEl = document.getElementById('lichessSelectionSummary');
  const runBtn = document.getElementById('runLichessBtn') as HTMLButtonElement | null;
  if (summaryEl) {
    summaryEl.textContent = `Blancs : ${state.selectedOpenings.white.size} · Noirs : ${state.selectedOpenings.black.size}`;
  }
  if (runBtn) {
    runBtn.disabled = state.selectedOpenings.white.size + state.selectedOpenings.black.size === 0;
  }
}

function toggleOpening(color: PlayerColor, id: string): void {
  analysisStore.toggleOpening(color, id);
}

function renderOpeningList(color: PlayerColor): void {
  const containerId = color === 'white' ? 'whiteOpenings' : 'blackOpenings';
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML = '';
  const entries = OPENING_ENTRIES.filter((entry) => entry.orientation === color);
  for (const entry of entries) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'opening-pill';
    item.textContent = entry.label;
    item.dataset.openingId = entry.id;
    item.addEventListener('click', () => {
      toggleOpening(color, entry.id);
    });
    container.appendChild(item);
  }
}

async function fetchAdviceForEntry(entry: OpeningEntry, rating: number, ratingOffset: number, speed: string): Promise<string> {
  const result = await adviseFromLichess({
    tokens: entry.tokens,
    playerRating: rating,
    ratingOffset,
    speed: mapSpeed(speed),
    top: 3,
  });
  const topSuggestion = result.suggestions[0];
  const summary = topSuggestion
    ? `Suggestion principale: ${topSuggestion.san} (${(topSuggestion.sideExpectedScore * 100).toFixed(1)}%)`
    : 'Pas de recommandation claire.';
  return `${entry.label} → ${summary}`;
}

async function runLichessAnalysis(): Promise<void> {
  const state = analysisStore.getState();
  const ratingOffsetInput = document.getElementById('ratingOffset') as HTMLInputElement | null;
  const speedSelect = document.getElementById('speedSelect') as HTMLSelectElement | null;
  const ratingOffset = ratingOffsetInput ? Number(ratingOffsetInput.value) || 0 : 0;
  const speed = speedSelect?.value || 'blitz';
  const rating = pickLichessBucket(1500, { offset: ratingOffset });

  const selected = [
    ...Array.from(state.selectedOpenings.white).map((id) => OPENING_ENTRIES.find((entry) => entry.id === id)).filter(Boolean),
    ...Array.from(state.selectedOpenings.black).map((id) => OPENING_ENTRIES.find((entry) => entry.id === id)).filter(Boolean),
  ] as OpeningEntry[];

  const playerInfo = document.getElementById('playerInfo');
  if (playerInfo) {
    playerInfo.innerHTML = '';
  }

  if (!selected.length) {
    updateError('Sélectionnez au moins une ouverture à analyser.');
    return;
  }

  analysisStore.update({ ratingBucket: rating });
  analysisStore.update({ lichessLoading: true });
  updateLoadingState(analysisStore.getState());
  updateError(null);

  try {
    const results: string[] = [];
    for (const entry of selected) {
      const text = await lichessQueue.enqueue(() => fetchAdviceForEntry(entry, rating, ratingOffset, speed));
      results.push(text);
    }
    if (playerInfo) {
      const list = document.createElement('ul');
      list.className = 'analysis-results';
      for (const line of results) {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
      }
      playerInfo.appendChild(list);
    }
  } catch (error) {
    updateError(error instanceof Error ? error.message : 'Analyse Lichess indisponible pour le moment.');
  } finally {
    analysisStore.update({ lichessLoading: false });
    updateLoadingState(analysisStore.getState());
  }
}

function bindModeToggle(): void {
  const opponentBtn = document.getElementById('modeOpponent');
  const selfBtn = document.getElementById('modeSelf');
  opponentBtn?.addEventListener('click', () => {
    analysisStore.update({ mode: 'opponent' });
    opponentBtn.classList.add('is-active');
    selfBtn?.classList.remove('is-active');
  });
  selfBtn?.addEventListener('click', () => {
    analysisStore.update({ mode: 'self' });
    selfBtn.classList.add('is-active');
    opponentBtn?.classList.remove('is-active');
  });
}

function bindFormControls(): void {
  const analyzeBtn = document.getElementById('analyzeBtn');
  analyzeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    void runLichessAnalysis();
  });

  const runLichessBtn = document.getElementById('runLichessBtn');
  runLichessBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    void runLichessAnalysis();
  });

  const ratingOffsetInput = document.getElementById('ratingOffset') as HTMLInputElement | null;
  ratingOffsetInput?.addEventListener('change', () => {
    const offset = Number(ratingOffsetInput.value) || 0;
    analysisStore.update({ config: { ...analysisStore.getState().config, ratingOffset: offset } });
  });

  const gmMode = document.getElementById('gmMode') as HTMLSelectElement | null;
  gmMode?.addEventListener('change', () => {
    analysisStore.update({ config: { ...analysisStore.getState().config, gmMode: gmMode.value as AnalysisState['config']['gmMode'] } });
  });

  const gmTopK = document.getElementById('gmTopK') as HTMLInputElement | null;
  gmTopK?.addEventListener('change', () => {
    analysisStore.update({ config: { ...analysisStore.getState().config, gmTopK: Number(gmTopK.value) || 3 } });
  });

  const gmCoverage = document.getElementById('gmCoverage') as HTMLInputElement | null;
  gmCoverage?.addEventListener('change', () => {
    analysisStore.update({ config: { ...analysisStore.getState().config, gmCoverage: (Number(gmCoverage.value) || 70) / 100 } });
  });

  const minMasterGames = document.getElementById('minMasterGames') as HTMLInputElement | null;
  minMasterGames?.addEventListener('change', () => {
    analysisStore.update({ config: { ...analysisStore.getState().config, minMasterGames: Number(minMasterGames.value) || 50 } });
  });
}

function hydrateFromStore(state: AnalysisState): void {
  updateLoadingState(state);
  renderSelectionSummary(state);
}

function syncOpeningButtons(state: AnalysisState): void {
  const whiteContainer = document.getElementById('whiteOpenings');
  const blackContainer = document.getElementById('blackOpenings');
  const applyState = (container: HTMLElement | null, color: PlayerColor) => {
    if (!container) {
      return;
    }
    container.querySelectorAll<HTMLElement>('[data-opening-id]').forEach((element) => {
      const id = element.dataset.openingId;
      if (!id) {
        return;
      }
      if (state.selectedOpenings[color].has(id)) {
        element.classList.add('is-selected');
      } else {
        element.classList.remove('is-selected');
      }
    });
  };
  applyState(whiteContainer, 'white');
  applyState(blackContainer, 'black');
}

export default {
  init(): void {
    renderOpeningList('white' as PlayerColor);
    renderOpeningList('black' as PlayerColor);
    bindModeToggle();
    bindFormControls();
    analysisStore.subscribe((state) => {
      hydrateFromStore(state);
      syncOpeningButtons(state);
    });
    const initialState = analysisStore.getState();
    hydrateFromStore(initialState);
    syncOpeningButtons(initialState);
    mountDuelModeView(document.getElementById('duelModeRoot'));
  },
};
