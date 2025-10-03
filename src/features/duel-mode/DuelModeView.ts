import { loadDuelReportSafely } from './duel';
import { DEFAULT_MAX_GAMES, DuelReport, createEmptyDuelReport } from './types';

function resolveRoot(target: string | HTMLElement | null | undefined): HTMLElement | null {
  if (!target) {
    return null;
  }
  if (typeof target === 'string') {
    return document.getElementById(target);
  }
  return target;
}

function formatJoinedDate(date: Date | null | undefined): string | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long' }).format(date);
}

function renderPlayerProfile(player: DuelReport['players']['white'], side: 'white' | 'black'): string {
  if (!player) {
    return `<div class="duel-player-card empty">Joueur ${side} inconnu</div>`;
  }
  const joined = formatJoinedDate(player.joined ?? null);
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

function renderOpeningStats(openings: DuelReport['openings']): string {
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

function showStatus(statusEl: HTMLElement | null, message: string, tone: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
  statusEl.hidden = !message;
}

function toggleLoading(root: HTMLElement | null, isLoading: boolean): void {
  root?.classList.toggle('is-loading', Boolean(isLoading));
}

function renderReport(root: HTMLElement, report: DuelReport): void {
  const playersContainer = root.querySelector<HTMLElement>('[data-duel-players]');
  const openingsContainer = root.querySelector<HTMLElement>('[data-duel-openings]');
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
      openingsContainer.innerHTML = "<p class=\"duel-placeholder\">Les statistiques d'ouvertures ne peuvent pas être affichées pour le moment.</p>";
    } else {
      openingsContainer.innerHTML = renderOpeningStats(report.openings);
    }
  }
}

export function mountDuelModeView(target: string | HTMLElement | null | undefined): HTMLElement | null {
  const root = resolveRoot(target);
  if (!root) {
    return null;
  }

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

  const form = root.querySelector<HTMLFormElement>('form');
  const statusEl = root.querySelector<HTMLElement>('[data-duel-status]');

  renderReport(root, createEmptyDuelReport());

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form) {
      return;
    }
    const formData = new FormData(form);
    const white = formData.get('white');
    const black = formData.get('black');
    const maxGames = Number(formData.get('maxGames')) || DEFAULT_MAX_GAMES;

    toggleLoading(root, true);
    showStatus(statusEl, 'Chargement des données Chess.com…', 'info');
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    const report = await loadDuelReportSafely({ white: String(white ?? ''), black: String(black ?? ''), maxGames });

    renderReport(root, report);
    if (report.error) {
      showStatus(statusEl, `Impossible de compléter le duel : ${report.error}`, 'error');
    } else if (report.totalGames) {
      showStatus(statusEl, `Analyse terminée · ${report.totalGames} parties agrégées`, 'success');
    } else {
      showStatus(statusEl, "Aucune partie récente trouvée. Essayez avec davantage de parties ou d'autres joueurs.", 'warning');
    }

    if (submitButton) {
      submitButton.disabled = false;
    }
    toggleLoading(root, false);
  });

  return root;
}
