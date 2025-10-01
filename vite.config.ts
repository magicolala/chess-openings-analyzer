import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for React build and GitHub Pages deployment under the repo subpath.
export default defineConfig({
  base: '/chess-openings-analyzer/',
  plugins: [react()],
});
