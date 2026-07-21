import { build } from 'vite';

for (const entryName of ['episode', 'leaderboard']) {
  process.env.BENCH_REPORT_ENTRY = entryName;
  await build({ configFile: new URL('../vite.config.ts', import.meta.url).pathname });
}
