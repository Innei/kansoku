import { fileURLToPath } from 'node:url';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type LibraryFormats } from 'vite';

const ENTRY_NAMES = ['episode', 'leaderboard'] as const;
type EntryName = (typeof ENTRY_NAMES)[number];

function resolveEntryName(): EntryName {
  const value = process.env.BENCH_REPORT_ENTRY;
  if (value === 'episode' || value === 'leaderboard') {
    return value;
  }
  throw new Error(`BENCH_REPORT_ENTRY must be one of ${ENTRY_NAMES.join(', ')}, got: ${value}`);
}

const GLOBAL_NAMES: Record<EntryName, string> = {
  episode: 'KansokuEpisodeReport',
  leaderboard: 'KansokuLeaderboardReport',
};

export default defineConfig(() => {
  const entryName = resolveEntryName();
  return {
    plugins: [react(), vanillaExtractPlugin()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      cssCodeSplit: false,
      lib: {
        entry: fileURLToPath(new URL(`./src/entries/${entryName}.tsx`, import.meta.url)),
        name: GLOBAL_NAMES[entryName],
        formats: ['iife'] satisfies LibraryFormats[],
        fileName: () => `${entryName}.js`,
        cssFileName: entryName,
      },
    },
  };
});
