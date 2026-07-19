import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),

  ssr: {
    noExternal: true,
  },
  build: {
    ssr: true,
    outDir: 'dist-preload',
    emptyOutDir: true,
    minify: false,
    target: 'node24',
    sourcemap: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/preload.ts', import.meta.url)),
      external: [/^electron($|\/)/],
      output: {
        format: 'cjs',
        entryFileNames: 'preload.cjs',
      },
    },
  },
});
