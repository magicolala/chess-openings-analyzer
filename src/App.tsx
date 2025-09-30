import { useEffect } from 'react';
import * as appModule from './legacyApp.js';

/**
 * Composant racine chargé de restituer le markup historique et de déclencher
 * l'initialisation legacy gérée par src/app.js.
 */
export default function App() {
  useEffect(() => {
    setTimeout(() => {
      (appModule.default as unknown as { init: () => void }).init();
    });
  }, []);

  return (
    <>
      <div className="container">
        <header className="app-header">
          <div className="app-header-icon" aria-hidden="true">
            ♟️
          </div>
          <div className="app-header-texts">
            <h1>Analyseur d&apos;Ouvertures Chess.com</h1>
            <p className="subtitle">
              Découvrez les ouvertures préférées de n&apos;importe quel joueur et préparez vos parties en quelques minutes.
            </p>
          </div>
        </header>

        <div className="mode-toggle" role="tablist" aria-label="Mode d'analyse">
          <button type="button" className="mode-btn is-active" data-mode="opponent" id="modeOpponent" aria-pressed="true">
            Analyser un adversaire
          </button>
          <button type="button" className="mode-btn" data-mode="self" id="modeSelf" aria-pressed="false">
            M&apos;analyser moi
          </button>
        </div>

        <div className="search-section" id="controlPanel">
          <div className="control-field">
            <label className="control-label" htmlFor="username">
              Pseudo Chess.com
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Pseudo du joueur sur Chess.com pour récupérer ses parties publiques."
                data-tooltip="Pseudo du joueur sur Chess.com pour récupérer ses parties publiques."
              >
                ?
              </span>
            </label>
            <input
              type="text"
              id="username"
              placeholder="Entrez le pseudo Chess.com (ex: hikaru)"
              autoComplete="username"
            />
          </div>
          <div className="control-field">
            <label className="control-label" htmlFor="speedSelect">
              Cadence cible
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Choisissez la cadence de jeu pour filtrer les statistiques et recommandations."
                data-tooltip="Choisissez la cadence de jeu pour filtrer les statistiques et recommandations."
              >
                ?
              </span>
            </label>
            <select id="speedSelect">
              <option value="auto">Auto (selon stats)</option>
              <option value="bullet">Bullet</option>
              <option value="blitz">Blitz</option>
              <option value="rapid">Rapid</option>
              <option value="classical">Classical</option>
              <option value="correspondence">Correspondence</option>
            </select>
          </div>
          <div className="control-field">
            <label className="control-label" htmlFor="ratingOffset">
              Décalage Elo Explorer
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Ajuste la plage Elo envoyée à Lichess Explorer pour mieux correspondre au niveau cible."
                data-tooltip="Ajuste la plage Elo envoyée à Lichess Explorer pour mieux correspondre au niveau cible."
              >
                ?
              </span>
            </label>
            <input type="number" id="ratingOffset" defaultValue={0} step={50} />
          </div>
          <div className="control-field">
            <label className="control-label" htmlFor="gmMode">
              Théorie GM
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Sélectionnez comment comparer les coups du joueur avec les recommandations de grands maîtres."
                data-tooltip="Sélectionnez comment comparer les coups du joueur avec les recommandations de grands maîtres."
              >
                ?
              </span>
            </label>
            <select id="gmMode">
              <option value="top1">Top 1</option>
              <option value="topK">Top K</option>
              <option value="coverage">Couverture %</option>
            </select>
          </div>
          <div className="control-field" id="gmTopKField">
            <label className="control-label" htmlFor="gmTopK">
              K (Top K)
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Nombre maximum de coups recommandés par les GMs à comparer."
                data-tooltip="Nombre maximum de coups recommandés par les GMs à comparer."
              >
                ?
              </span>
            </label>
            <input type="number" id="gmTopK" min={1} max={6} defaultValue={3} />
          </div>
          <div className="control-field" id="gmCoverageField">
            <label className="control-label" htmlFor="gmCoverage">
              Couverture minimale (%)
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Seuil de couverture des coups GM pour valider une recommandation."
                data-tooltip="Seuil de couverture des coups GM pour valider une recommandation."
              >
                ?
              </span>
            </label>
            <input type="number" id="gmCoverage" min={10} max={100} defaultValue={70} step={5} />
          </div>
          <div className="control-field">
            <label className="control-label" htmlFor="minMasterGames">
              Volume Masters minimum
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Nombre minimal de parties de maîtres pour qu'une ligne soit considérée fiable."
                data-tooltip="Nombre minimal de parties de maîtres pour qu'une ligne soit considérée fiable."
              >
                ?
              </span>
            </label>
            <input type="number" id="minMasterGames" min={10} max={500} step={10} defaultValue={50} />
          </div>
          <div className="control-field toggle-field" id="engineSettings">
            <span className="control-label">
              Moteur local
              <span
                className="info-bubble"
                tabIndex={0}
                role="tooltip"
                aria-label="Active un moteur Stockfish WebAssembly pour évaluer les positions clés directement dans votre navigateur."
                data-tooltip="Active un moteur Stockfish WebAssembly pour évaluer les positions clés directement dans votre navigateur."
              >
                ?
              </span>
            </span>
            <label className="engine-toggle" htmlFor="engineEnabled">
              <input type="checkbox" id="engineEnabled" />
              <span>Activer Stockfish local</span>
            </label>
            <input
              type="text"
              id="enginePath"
              placeholder="Chemin Worker Stockfish (optionnel)"
              autoComplete="off"
              aria-label="Chemin vers le worker Stockfish"
            />
            <div className="engine-options">
              <div className="engine-option">
                <label htmlFor="engineDepth">
                  Profondeur
                  <span
                    className="info-bubble"
                    tabIndex={0}
                    role="tooltip"
                    aria-label="Nombre de demi-coups analysés par le moteur pour évaluer une position."
                    data-tooltip="Nombre de demi-coups analysés par le moteur pour évaluer une position."
                  >
                    ?
                  </span>
                </label>
                <input type="number" id="engineDepth" min={6} max={30} defaultValue={18} />
              </div>
              <div className="engine-option">
                <label htmlFor="engineMultiPv">
                  MultiPV
                  <span
                    className="info-bubble"
                    tabIndex={0}
                    role="tooltip"
                    aria-label="Nombre de meilleures lignes renvoyées par Stockfish pour comparer les variantes."
                    data-tooltip="Nombre de meilleures lignes renvoyées par Stockfish pour comparer les variantes."
                  >
                    ?
                  </span>
                </label>
                <input type="number" id="engineMultiPv" min={1} max={5} defaultValue={3} />
              </div>
            </div>
          </div>
          <button id="analyzeBtn" className="primary-action">
            Lancer l&apos;analyse
          </button>
        </div>

        <div id="loading" className="loading">
          ⏳ Chargement des parties en cours...
        </div>

        <div id="error" className="error" />

        <div id="playerInfo" />

        <div id="prepActions" className="prep-actions">
          <button type="button" id="exportJsonBtn" className="secondary-button">
            Export JSON
          </button>
          <button type="button" id="exportMarkdownBtn" className="secondary-button">
            Export Markdown
          </button>
          <button type="button" id="exportPdfBtn" className="secondary-button">
            PDF imprimable
          </button>
        </div>

        <div id="lichessSelection" className="lichess-selection" aria-live="polite">
          <div className="lichess-selection-info">
            Sélectionnez les ouvertures à enrichir avec Explorer Lichess pour limiter les requêtes
            <span
              className="info-bubble"
              tabIndex={0}
              role="tooltip"
              aria-label="L'analyse Lichess Explorer complète les statistiques par couleur avec les bases de données officielles."
              data-tooltip="L'analyse Lichess Explorer complète les statistiques par couleur avec les bases de données officielles."
            >
              ?
            </span>
            .
          </div>
          <div className="lichess-selection-actions">
            <span id="lichessSelectionSummary" className="lichess-selection-summary">
              Blancs : 0 · Noirs : 0
            </span>
            <button type="button" id="runLichessBtn" className="secondary-button" disabled>
              Analyser les ouvertures sélectionnées
            </button>
            <button type="button" id="resumeLichessBtn" className="secondary-button" hidden>
              Analyser le reste
            </button>
            <span id="lichessCooldownNotice" className="lichess-cooldown-notice" hidden />
          </div>
        </div>

        <div id="openingsSection" className="openings-section">
          <div className="openings-card">
            <h3>
              <span className="chess-piece white-piece">♔</span>
              Ouvertures avec les Blancs
            </h3>
            <div id="whiteOpenings" />
          </div>

          <div className="openings-card">
            <h3>
              <span className="chess-piece black-piece">♚</span>
              Ouvertures avec les Noirs
            </h3>
            <div id="blackOpenings" />
          </div>
        </div>

        <section id="duelModeRoot" className="duel-mode-section" aria-label="Mode Duel Chess.com" />
      </div>

      <div id="boardPreview">
        <div id="boardPreviewBoard" className="board-preview-board" aria-hidden="true" />
        <div className="board-preview-caption" id="boardPreviewCaption" />
      </div>

      <div id="lineModal" className="line-modal" role="dialog" aria-modal="true" aria-hidden="true">
        <div className="line-modal-dialog">
          <div className="line-modal-header">
            <div className="line-modal-title" id="lineModalTitle">
              Séquence
            </div>
            <button type="button" className="line-modal-close" id="lineModalClose" aria-label="Fermer">
              ×
            </button>
          </div>
          <div className="line-modal-content">
            <div className="line-modal-board" id="lineModalBoard" aria-hidden="false" />
            <div className="line-modal-sidebar">
              <div className="line-modal-subtitle" id="lineModalSummary" />
              <div className="line-modal-controls">
                <button type="button" id="lineModalStart">
                  ⏮ Début
                </button>
                <button type="button" id="lineModalPrev">
                  ◀️ Précédent
                </button>
                <button type="button" id="lineModalNext">
                  ▶️ Suivant
                </button>
                <button type="button" id="lineModalEnd">
                  ⏭ Fin
                </button>
              </div>
              <div className="line-modal-moves" id="lineModalMoves" />
            </div>
          </div>
          <div className="line-modal-footer">
            <a
              href="https://lichess.org/analysis"
              target="_blank"
              rel="noopener"
              id="lineModalLichess"
              className="line-modal-link"
            >
              ↗ Voir la position sur Lichess
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
