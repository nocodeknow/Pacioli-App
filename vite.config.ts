import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@finance-platform/shared-types': path.resolve(__dirname, './src/shared-types/index.ts'),
    },
  },
  server: {
    host: true,
    // This proxy is only used with the legacy `pnpm dev:node` script.
    // When using `pnpm dev` (wrangler pages dev), Wrangler serves
    // both the static frontend and the API Functions — no proxy needed.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
