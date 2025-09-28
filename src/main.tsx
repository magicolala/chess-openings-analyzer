import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'cm-chessboard/assets/chessboard.css';
import '../styles.css';

// Point d'entrée React chargé de monter l'application et d'orchestrer le bundler Vite.

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Impossible de trouver l'élément racine pour monter l'application React.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
