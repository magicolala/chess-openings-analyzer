// Composant d'interface pour piloter le mode Duel.

import { loadDuelReportSafely } from './duel.js';
import { DEFAULT_MAX_GAMES, createEmptyDuelReport } from './types.js';

function resolveRoot(target) {
  if (!target) return null;
  if (typeof target === 'string') {
    return document.getElementById(target);
  }
  return target;
}

function formatJoinedDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long' }).format(date);
}

function renderPlayerProfile(player, side) {
  if (!player) {
    return `<div class="duel-player-card empty">Joueur ${side} inconnu</div>`;
  }
  const joined = formatJoinedDate(player.joined);
  const country = player.country ? player.country.toUpperCase() : null;
  return `
    <article class="duel-player-card">
      <header>
        <div class="duel-player-side">${side === 'white' ? '♔' : '♚'}</div>
        <div class="duel-player-identity">
          <h4>${player.username || 'Inconnu'}</h4>
          ${player.name ? `<p class="duel-player-name">${player.name}</p>` : ''}
        </div>
      </header>
      <dl class="duel-player-meta">
        ${country ? `<div><dt>Pays</dt><dd>${country}</dd></div>` : ''}
        ${joined ? `<div><dt>Inscrit</dt><dd>${joined}</dd></div>` : ''}
        ${player.url ? `<div><dt>Profil</dt><dd><a href="${player.url}" target="_blank" rel="noopener">Voir</a></dd></div>` : ''}
      </dl>
    </article>
  `;
}

function renderOpeningStats(openings) {
  if (!openings?.length) {
    return '<p>Aucune ouverture commune détectée pour le moment.</p>';
  }
  const rows = openings
    .slice(0, 10)
    .map(
      (entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${entry.line}</td>
          <td>${entry.count}</td>
          <td>${entry.firstPlayer || '—'}</td>
        </tr>
      `,
    )
    .join('');
  return `
    <table class="duel-openings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Ouverture</th>
          <th>Parties</th>
          <th>Premier joueur</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function showStatus(statusEl, message, tone = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
  statusEl.hidden = !message;
}

function toggleLoading(root, isLoading) {
  root?.classList.toggle('is-loading', Boolean(isLoading));
}

function renderReport(root, report) {
  const playersContainer = root.querySelector('[data-duel-players]');
  const openingsContainer = root.querySelector('[data-duel-openings]');
  if (playersContainer) {
    playersContainer.innerHTML = `
      ${renderPlayerProfile(report.players.white, 'white')}
      ${renderPlayerProfile(report.players.black, 'black')}
    `;
  }
  if (openingsContainer) {
    if (!report.totalGames && !report.error && (!report.players.white?.username || !report.players.black?.username)) {
      openingsContainer.innerHTML = '<p class="duel-placeholder">Renseignez deux pseudos Chess.com puis lancez le duel pour comparer leurs répertoires.</p>';
    } else if (report.error) {
      openingsContainer.innerHTML = '<p class="duel-placeholder">Les statistiques d\'ouvertures ne peuvent pas être affichées pour le moment.</p>';
    } else {
      openingsContainer.innerHTML = renderOpeningStats(report.openings);
    }
  }
}

export function mountDuelModeView(target) {
  const root = resolveRoot(target);
  if (!root) return null;

  root.classList.add('duel-mode-root');
  root.innerHTML = `
    <section class="duel-mode-panel">
      <header class="duel-mode-header">
        <h2>Mode Duel Chess.com</h2>
        <p>
          Comparez rapidement les répertoires d'ouverture de deux joueurs Chess.com.
          Nous récupérons leurs parties récentes et identifions les lignes les plus jouées.
        </p>
      </header>
      <form class="duel-mode-form" autocomplete="off">
        <div class="duel-inputs">
          <label>
            <span>Blancs</span>
            <input type="text" name="white" placeholder="Pseudo joueur 1" required />
          </label>
          <label>
            <span>Noirs</span>
            <input type="text" name="black" placeholder="Pseudo joueur 2" required />
          </label>
          <label>
            <span>Parties récentes</span>
            <input type="number" name="maxGames" min="5" max="50" value="${DEFAULT_MAX_GAMES}" />
          </label>
        </div>
        <button type="submit" class="primary-action">Lancer le duel</button>
        <p class="duel-status" data-duel-status hidden></p>
      </form>
      <div class="duel-mode-results">
        <div class="duel-players" data-duel-players></div>
        <div class="duel-openings" data-duel-openings></div>
      </div>
    </section>
  `;

  const form = root.querySelector('form');
  const statusEl = root.querySelector('[data-duel-status]');

  renderReport(root, createEmptyDuelReport());

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const white = formData.get('white');
    const black = formData.get('black');
    const maxGames = Number(formData.get('maxGames')) || DEFAULT_MAX_GAMES;

    toggleLoading(root, true);
    showStatus(statusEl, 'Chargement des données Chess.com…', 'info');
    form.querySelector('button[type="submit"]').disabled = true;

    const report = await loadDuelReportSafely({ white, black, maxGames });

    renderReport(root, report);
    if (report.error) {
      showStatus(statusEl, `Impossible de compléter le duel : ${report.error}`, 'error');
    } else if (report.totalGames) {
      showStatus(statusEl, `Analyse terminée · ${report.totalGames} parties agrégées`, 'success');
    } else {
      showStatus(statusEl, "Aucune partie récente trouvée. Essayez avec davantage de parties ou d'autres joueurs.", 'warning');
    }

    form.querySelector('button[type="submit"]').disabled = false;
    toggleLoading(root, false);
  });

  return root;
}
