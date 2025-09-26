// @ts-nocheck
import type { AnalysisController } from '../application/analysis/AnalysisController';
import { AnalysisMode } from '../application/analysis/state';
import type { AnalysisView } from './AnalysisView';

export class DomAnalysisView implements AnalysisView {
  constructor() {}

  initialize(controller: AnalysisController): void {
    const state = controller.getState();

    const ANALYSIS_MODES = {
      opponent: AnalysisMode.Opponent,
      self: AnalysisMode.Self,
    };

    const usernameInput = document.getElementById('username');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const errorDiv = document.getElementById('error');
    const loading = document.getElementById('loading');
    const playerInfoDiv = document.getElementById('playerInfo');
    const whiteDiv = document.getElementById('whiteOpenings');
    const blackDiv = document.getElementById('blackOpenings');
    const prepActions = document.getElementById('prepActions');

    function hideResults() {
      if (playerInfoDiv) playerInfoDiv.style.display = 'none';
      if (whiteDiv) whiteDiv.innerHTML = '';
      if (blackDiv) blackDiv.innerHTML = '';
      if (prepActions) prepActions.style.display = 'none';
    }

    function showPrepActions() {
      if (prepActions) prepActions.style.display = 'flex';
    }

    function showError(message) {
      if (!errorDiv) return;
      errorDiv.textContent = `❌ Erreur : ${message}`;
      errorDiv.style.display = 'block';
    }

    function hideError() {
      if (!errorDiv) return;
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }

    function showLoading() {
      if (loading) loading.style.display = 'block';
    }

    function hideLoading() {
      if (loading) loading.style.display = 'none';
    }

    function readNumberInput(id, fallback = 0) {
      const el = document.getElementById(id);
      if (!el) return fallback;
      const value = Number(el.value);
      return Number.isFinite(value) ? value : fallback;
    }

    function readAnalysisConfig() {
      const gmModeSelect = document.getElementById('gmMode');
      const gmMode = gmModeSelect ? gmModeSelect.value : 'disabled';
      return {
        speedOverride: document.getElementById('speedSelect')?.value || 'auto',
        ratingOffset: readNumberInput('ratingOffset', 0),
        gmMode,
        gmTopK: readNumberInput('gmTopK', 3),
        gmCoverage: readNumberInput('gmCoverage', 70) / 100,
        minMasterGames: readNumberInput('minMasterGames', 50),
        engine: {
          enabled: Boolean(document.getElementById('engineEnabled')?.checked),
          path: document.getElementById('enginePath')?.value?.trim() || '',
          depth: readNumberInput('engineDepth', 18),
          multipv: readNumberInput('engineMultiPv', 3),
        },
      };
    }

    function updateGmOptionVisibility() {
      const gmMode = document.getElementById('gmMode')?.value;
      const topKField = document.getElementById('gmTopKField');
      const coverageField = document.getElementById('gmCoverageField');
      if (gmMode === 'topK') {
        if (topKField) topKField.style.display = '';
        if (coverageField) coverageField.style.display = 'none';
      } else if (gmMode === 'coverage') {
        if (topKField) topKField.style.display = 'none';
        if (coverageField) coverageField.style.display = '';
      } else {
        if (topKField) topKField.style.display = 'none';
        if (coverageField) coverageField.style.display = 'none';
      }
    }

    function updateEngineControlsAvailability() {
      const container = document.getElementById('engineSettings');
      const enabled = Boolean(document.getElementById('engineEnabled')?.checked);
      if (!container) return;
      container.classList.toggle('is-disabled', !enabled);
      const inputs = container.querySelectorAll('input, select, textarea');
      inputs.forEach((input) => {
        if (input.id === 'engineEnabled') return;
        input.disabled = !enabled;
      });
      const pathInput = document.getElementById('enginePath');
      if (pathInput) {
        pathInput.placeholder = enabled
          ? 'Chemin Worker Stockfish (optionnel)'
          : 'Activez le moteur pour saisir un chemin';
      }
    }

    function renderPlayerInfo(playerData, statsData) {
      if (!playerInfoDiv) return;
      if (!playerData) {
        playerInfoDiv.style.display = 'none';
        return;
      }
      const username = playerData.username || 'Inconnu';
      const rating = statsData?.chess_blitz?.last?.rating || statsData?.chess_rapid?.last?.rating || 'N/A';
      playerInfoDiv.innerHTML = `
        <div class="player-card">
          <div class="player-name">${username}</div>
          <div class="player-rating">Dernier elo connu : ${rating}</div>
        </div>
      `;
      playerInfoDiv.style.display = 'block';
    }

    function renderOpenings(container, label, openings) {
      if (!container) return;
      const entries = Object.entries(openings || {})
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);
      if (!entries.length) {
        container.innerHTML = '<p>Aucune partie récente analysée.</p>';
        return;
      }
      const items = entries
        .map(([name, stats]) => {
          const total = stats.count;
          const winRate = total ? Math.round((stats.wins / total) * 100) : 0;
          return `
            <li class="opening-item" data-opening-name="${name}">
              <div class="opening-title">${name}</div>
              <div class="opening-meta">${total} parties · ${winRate}% de victoires</div>
            </li>
          `;
        })
        .join('');
      container.innerHTML = `
        <h3>${label}</h3>
        <ul class="opening-list">${items}</ul>
      `;
    }

    function setAnalysisMode(mode) {
      if (!Object.values(ANALYSIS_MODES).includes(mode)) return;
      controller.setMode(mode);
      const buttons = document.querySelectorAll('.mode-btn');
      buttons.forEach((btn) => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      const subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        subtitle.textContent =
          mode === AnalysisMode.Opponent
            ? 'Préparez vos parties contre un adversaire précis'
            : 'Analysez vos propres débuts et trouvez des gains rapides';
      }
      hideResults();
    }

    async function runAnalysis() {
      const username = usernameInput?.value?.trim();
      if (!username) {
        showError('Veuillez entrer un pseudo Chess.com');
        return;
      }
      const config = readAnalysisConfig();
      hideError();
      hideResults();
      showLoading();
      if (analyzeBtn) analyzeBtn.disabled = true;
      try {
        const result = await controller.analyze(username, config);
        renderPlayerInfo(result.player, result.stats);
        renderOpenings(whiteDiv, 'Plans contre ses Blancs', result.whiteOpenings);
        renderOpenings(blackDiv, 'Plans contre ses Noirs', result.blackOpenings);
        showPrepActions();
      } catch (err) {
        showError(err?.message || 'Erreur inconnue');
      } finally {
        hideLoading();
        if (analyzeBtn) analyzeBtn.disabled = false;
      }
    }

    function exportPrep(format) {
      const prep = state.latestPrep;
      if (!prep) {
        showError('Aucune préparation à exporter.');
        return;
      }
      const payload = {
        mode: prep.mode,
        speed: prep.metadata.speed,
        ratingBucket: prep.metadata.ratingBucket,
        player: prep.player,
        openings: prep.openings,
      };
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prep-${prep.player?.username || 'joueur'}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        showError('Export disponible uniquement en JSON dans cette version.');
      }
    }

    document.getElementById('modeOpponent')?.addEventListener('click', () => setAnalysisMode(AnalysisMode.Opponent));
    document.getElementById('modeSelf')?.addEventListener('click', () => setAnalysisMode(AnalysisMode.Self));
    document.getElementById('gmMode')?.addEventListener('change', updateGmOptionVisibility);
    document.getElementById('engineEnabled')?.addEventListener('change', updateEngineControlsAvailability);
    usernameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runAnalysis();
      }
    });
    analyzeBtn?.addEventListener('click', runAnalysis);
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => exportPrep('json'));
    document.getElementById('exportMarkdownBtn')?.addEventListener('click', () => exportPrep('markdown'));
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => exportPrep('pdf'));

    updateGmOptionVisibility();
    updateEngineControlsAvailability();
    setAnalysisMode(state.mode);
  }
}
