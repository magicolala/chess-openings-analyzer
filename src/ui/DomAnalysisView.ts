// @ts-nocheck
import type { AnalysisController } from '../application/analysis/AnalysisController';
import { AnalysisMode } from '../application/analysis/state';
import type { AnalysisView } from './AnalysisView';
import { Chess } from 'chess.js';
import { Chessboard } from 'cm-chessboard';

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
    const openingsSection = document.getElementById('openingsSection');
    const boardPreview = createBoardPreview();

    function createBoardPreview() {
      const preview = document.getElementById('boardPreview');
      const boardHost = document.getElementById('boardPreviewBoard');
      const caption = document.getElementById('boardPreviewCaption');
      if (!preview || !boardHost || !caption) return null;

      const chess = new Chess();
      const board = new Chessboard(boardHost, {
        position: 'start',
        orientation: 'white',
        animationDuration: 300,
        assetsUrl: 'https://unpkg.com/cm-chessboard@7.11.0/assets/',
        style: {
          cssClass: 'board-preview-surface',
          showCoordinates: false,
          moveMarker: false,
          borderType: 'none',
        },
      });

      preview.setAttribute('aria-hidden', 'true');

      let timer = null;
      let visible = false;

      function stopCycle() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      function computePositions(tokens = []) {
        chess.reset();
        const positions = [chess.fen()];
        for (const san of tokens) {
          if (!san) continue;
          try {
            const move = chess.move(san, { sloppy: true });
            if (move) {
              positions.push(chess.fen());
            }
          } catch (err) {
            break;
          }
        }
        return positions;
      }

      function showPreview({ tokens, title, captionText, orientation }) {
        const playable = Array.isArray(tokens) ? tokens.filter(Boolean).slice(0, 16) : [];
        const positions = computePositions(playable);
        if (!playable.length || positions.length <= 1) {
          hidePreview();
          return;
        }
        stopCycle();
        board.setOrientation(orientation === 'black' ? 'black' : 'white');
        let index = 0;
        board.setPosition(positions[index], false);
        caption.textContent = captionText || title || '';
        preview.classList.add('is-visible');
        preview.setAttribute('aria-hidden', 'false');
        visible = true;
        if (positions.length > 1) {
          timer = window.setInterval(() => {
            index = (index + 1) % positions.length;
            board.setPosition(positions[index], true);
          }, 1800);
        }
      }

      function hidePreview() {
        stopCycle();
        preview.classList.remove('is-visible');
        preview.setAttribute('aria-hidden', 'true');
        visible = false;
        caption.textContent = '';
      }

      function bind(element, data) {
        if (!element || !data) return;
        const handleEnter = () => showPreview(data);
        const handleLeave = () => hidePreview();
        element.addEventListener('mouseenter', handleEnter);
        element.addEventListener('focus', handleEnter);
        element.addEventListener('mouseleave', handleLeave);
        element.addEventListener('blur', handleLeave);
        element.addEventListener('touchstart', handleEnter, { passive: true });
        element.addEventListener('touchend', handleLeave);
      }

      return {
        bind,
        show: showPreview,
        hide: hidePreview,
        isActive: () => visible,
      };
    }

    function hideResults() {
      if (playerInfoDiv) playerInfoDiv.style.display = 'none';
      if (whiteDiv) whiteDiv.innerHTML = '';
      if (blackDiv) blackDiv.innerHTML = '';
      if (prepActions) prepActions.style.display = 'none';
      if (openingsSection) openingsSection.style.display = 'none';
      if (boardPreview) boardPreview.hide();
    }

    function showResults() {
      if (playerInfoDiv) playerInfoDiv.style.display = 'block';
      if (prepActions) prepActions.style.display = 'flex';
      if (openingsSection) openingsSection.style.display = 'grid';
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

    function createPlayerCard(playerData, statsData) {
      const card = document.createElement('div');
      card.className = 'player-card';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'player-name';
      nameDiv.textContent = playerData.username || 'Inconnu';
      card.appendChild(nameDiv);

      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'player-rating';
      const rating = statsData?.chess_blitz?.last?.rating || statsData?.chess_rapid?.last?.rating || 'N/A';
      ratingDiv.textContent = `Dernier elo connu : ${rating}`;
      card.appendChild(ratingDiv);

      return card;
    }

    function renderPlayerInfo(playerData, statsData) {
      if (!playerInfoDiv) return;
      if (!playerData) {
        playerInfoDiv.style.display = 'none';
        return;
      }
      playerInfoDiv.innerHTML = ''; // Clear previous content
      const card = createPlayerCard(playerData, statsData);
      playerInfoDiv.appendChild(card);
      playerInfoDiv.style.display = 'block';
    }

    function renderOpenings(container, label, openings) {
      if (!container) return;
      container.innerHTML = ''; // Clear previous content

      const entries = Object.entries(openings || {})
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);

      if (!entries.length) {
        const p = document.createElement('p');
        p.textContent = 'Aucune partie récente analysée.';
        container.appendChild(p);
        if (boardPreview) boardPreview.hide();
        return;
      }

      const header = document.createElement('h3');
      header.textContent = label;
      container.appendChild(header);

      const list = document.createElement('ul');
      list.className = 'opening-list';

      let firstPreview = null;

      entries.forEach(([name, stats]) => {
        const item = document.createElement('li');
        item.className = 'opening-item';
        item.dataset.openingName = name;
        item.tabIndex = 0;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'opening-title';
        titleDiv.textContent = name;
        item.appendChild(titleDiv);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'opening-meta';
        const total = stats.count;
        const winRate = total ? Math.round((stats.wins / total) * 100) : 0;
        metaDiv.textContent = `${total} parties · ${winRate}% de victoires`;
        item.appendChild(metaDiv);

        const tokens = Array.isArray(stats._sampleTokens) ? stats._sampleTokens : [];
        const sampleGame = Array.isArray(stats.games)
          ? stats.games.find((game) => typeof game?.youAreWhite === 'boolean')
          : null;
        const orientation = sampleGame?.youAreWhite === false ? 'black' : 'white';
        const captionText = `${name} · ${total} parties · ${winRate}% de victoires`;
        if (boardPreview && tokens.length) {
          const payload = { tokens, title: name, captionText, orientation };
          boardPreview.bind(item, payload);
          if (!firstPreview) firstPreview = payload;
        }

        list.appendChild(item);
      });

      container.appendChild(list);

      if (boardPreview) {
        if (firstPreview && !boardPreview.isActive()) {
          boardPreview.show(firstPreview);
        } else if (!firstPreview && !boardPreview.isActive()) {
          boardPreview.hide();
        }
      }
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
        showResults();
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
