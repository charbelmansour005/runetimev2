import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Express API runs separately (npm run dev:server).
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: {
    // three.js (~560 kB) is lazy-loaded for the hero only, so allow it without a warning.
    chunkSizeWarningLimit: 600,
  },
});
