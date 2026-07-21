import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { makeEpisodeViewData, makeLeaderboardViewData } from './fixtures';

const distDir = path.join(process.cwd(), 'dist');

const fixtures = {
  episode: makeEpisodeViewData,
  leaderboard: makeLeaderboardViewData,
} as const;

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe.each(['episode', 'leaderboard'] as const)('dist/%s runtime', (entry) => {
  const js = readFileSync(path.join(distDir, `${entry}.js`), 'utf8');

  it('embeds no raw </script> that would break the inline shell', () => {
    expect(js.includes('</script')).toBe(false);
  });

  it('mounts into #root in a browser-like realm that has no process global', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    const win = dom.window as unknown as Record<string, unknown>;
    delete win.process;
    win.IntersectionObserver = NoopObserver;
    win.ResizeObserver = NoopObserver;
    win.__KANSOKU_REPORT_DATA__ = fixtures[entry]();

    expect(typeof win.process).toBe('undefined');
    expect(() => dom.window.eval(js)).not.toThrow();

    const root = dom.window.document.getElementById('root');
    for (let tick = 0; tick < 20 && (root?.childElementCount ?? 0) === 0; tick += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(root?.childElementCount ?? 0).toBeGreaterThan(0);
  });
});
