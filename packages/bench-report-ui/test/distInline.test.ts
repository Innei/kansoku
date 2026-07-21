import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const distDir = path.join(process.cwd(), 'dist');

function readAssets(entry: 'episode' | 'leaderboard') {
  const js = readFileSync(path.join(distDir, `${entry}.js`), 'utf8');
  const css = readFileSync(path.join(distDir, `${entry}.css`), 'utf8');
  return { js, css };
}

function buildShellHtml(js: string, css: string): string {
  return `<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
}

describe.each(['episode', 'leaderboard'] as const)('dist/%s assets', (entry) => {
  it('inline into a self-contained shell with no external <script>/<link> refs', () => {
    const { js, css } = readAssets(entry);
    const html = buildShellHtml(js, css);
    expect(html.startsWith('<!doctype html>')).toBe(true);

    const shellOnly = html.replace(css, '').replace(js, '');
    expect(shellOnly).toContain('<style></style>');
    expect(shellOnly).toContain('<script></script>');
    expect(shellOnly).not.toMatch(/\bsrc=/i);
    expect(shellOnly).not.toMatch(/\bhref=/i);
    expect(shellOnly).not.toContain('<link');
  });
});
