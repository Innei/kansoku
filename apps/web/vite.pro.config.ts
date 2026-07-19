import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { proOverlayPlugin } from '../../packages/build-overlay/src/index.js';

const KERNEL_PORT = Number(process.env.KERNEL_PORT || 5200);
const KERNEL_URL = `http://localhost:${KERNEL_PORT}`;
const APP_VERSION = JSON.parse(
  readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8'),
).version;

const edition = process.env.KANSOKU_EDITION === 'pro' ? 'pro' : 'oss';
const overlayRoot = fileURLToPath(new URL('../pro/overlays/apps/web', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...(edition === 'pro' ? [proOverlayPlugin({ overlayRoot })] : []),
  ],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  resolve: {
    alias: {
      '@web': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5199,
    proxy: {
      '/api': { target: KERNEL_URL, ws: true },
      '/legacy': { target: KERNEL_URL },
    },
  },
  build: {
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
    },
  },
});
