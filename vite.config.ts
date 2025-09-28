import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration Vite orientée React pour bundler l'application et gérer JSX/TS.
export default defineConfig({
  plugins: [react()],
});
