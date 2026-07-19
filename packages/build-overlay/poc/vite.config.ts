import { fileURLToPath } from 'node:url';
import { proOverlayPlugin } from '../src/index.js';

const edition = process.env.KANSOKU_EDITION === 'pro' ? 'pro' : 'oss';

export default {
  plugins: edition === 'pro' ? [proOverlayPlugin()] : [],
  build: {
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./entry.ts', import.meta.url)),
      fileName: 'edition',
      formats: ['es'],
    },
    minify: false,
    outDir: fileURLToPath(new URL(`../dist-poc/vite-${edition}`, import.meta.url)),
  },
};
