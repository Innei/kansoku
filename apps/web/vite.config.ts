import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { isProModule, proLeakGuard, proOverlayPlugin } from '@kansoku/build-overlay';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const KERNEL_PORT = Number(process.env.KERNEL_PORT || 5200);
const KERNEL_URL = `http://localhost:${KERNEL_PORT}`;
const APP_VERSION = JSON.parse(
  readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8'),
).version;

const overlayRoot = fileURLToPath(new URL('../pro/overlays', import.meta.url));
const proPresent = process.env.KANSOKU_FORCE_FREE !== '1' && existsSync(overlayRoot);

export const PRO_CHUNK_DIR = '__pro__/';

export interface ChunkNameInput {
  name: string;
  moduleIds: readonly string[];
  facadeModuleId?: string | null;
}

export function chunkFileNamesFor(chunk: ChunkNameInput): string {
  const isPro =
    chunk.moduleIds.some(isProModule) ||
    (chunk.facadeModuleId != null && isProModule(chunk.facadeModuleId));
  return isPro ? `assets/${PRO_CHUNK_DIR}[name]-[hash].js` : 'assets/[name]-[hash].js';
}

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...(proPresent ? [proOverlayPlugin({ overlayRoot })] : []),
    proLeakGuard({ proDir: PRO_CHUNK_DIR }),
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
      output: {
        chunkFileNames: chunkFileNamesFor,
      },
    },
  },
});
