import { mkdtempSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LeaderboardReportViewData } from '@kansoku/bench-report-ui/types';
import { beforeAll, describe, expect, it } from 'vitest';
import { type ReportConfigSnapshot } from '../../src/report/render.js';
import { renderReportHtml } from '../../src/report/renderHtml.js';
import { runScore } from '../../src/score/score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATASETS = join(HERE, '..', 'fixtures', 'datasets');
const FIXTURE = join(HERE, '..', 'fixtures', 'predictions', 'predictions.jsonl');
const DATASET_VERSION = 'integration-v1';
const BANK = 'swing';
const MODELS = ['alpha/one', 'beta/two'];

function extractViewData(html: string): LeaderboardReportViewData {
  const marker = 'window.__KANSOKU_REPORT_DATA__=';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('missing window.__KANSOKU_REPORT_DATA__ assignment');
  const end = html.indexOf(';</script>', start);
  if (end === -1) throw new Error('missing script boundary after embedded data');
  return JSON.parse(html.slice(start + marker.length, end)) as LeaderboardReportViewData;
}

describe('renderReportHtml on the minimal fixture dataset', () => {
  const root = mkdtempSync(join(tmpdir(), 'bench-html-'));
  const resultsRoot = join(root, 'results');
  const runId = 'run-html';
  const runDir = join(resultsRoot, runId);
  const config: ReportConfigSnapshot = {
    runId,
    startedAt: '2026-07-17T00:00:00Z',
    datasetVersion: DATASET_VERSION,
    bank: BANK,
    gitSha: 'html-sha',
    modes: ['blind'],
  };

  let scores: Awaited<ReturnType<typeof runScore>>;
  let html: string;
  let viewData: LeaderboardReportViewData;

  beforeAll(async () => {
    await fs.mkdir(runDir, { recursive: true });
    await fs.copyFile(FIXTURE, join(runDir, 'predictions.jsonl'));
    await fs.writeFile(
      join(runDir, 'config.json'),
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8',
    );
    scores = await runScore({
      runId,
      datasetVersion: DATASET_VERSION,
      resultsRoot,
      datasetsRoot: DATASETS,
      bank: BANK,
    });
    html = renderReportHtml(scores, config, { now: () => new Date('2026-07-18T00:00:00Z') }).html;
    viewData = extractViewData(html);
  });

  it('produces a self-contained document with doctype, inline styles, and inline script', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).toContain('<script>');
    const shellOnly = html
      .replace(/<style>[\S\s]*?<\/style>/, '<style></style>')
      .replace(/<script>window\.__KANSOKU_REPORT_DATA__=[\S\s]*?<\/script>/, '<script></script>')
      .replace(/<script>(?!<\/script>)[\S\s]*?<\/script>/, '<script></script>');
    expect(shellOnly).not.toMatch(/\bsrc=/i);
    expect(shellOnly).not.toContain('<link');
  });

  it('embeds every scored model as a leaderboard row or a baseline row', () => {
    const ids = [...viewData.realRows, ...viewData.baselineRows].map((row) => row.id);
    for (const model of MODELS) {
      expect(ids).toContain(model);
    }
  });

  it('sets the initial selection to the top real model and provides its detail card', () => {
    expect(viewData.initialSelectedId).toBe(viewData.realRows[0]?.id ?? null);
    expect(viewData.initialSelectedId).not.toBeNull();
    expect(viewData.details[viewData.initialSelectedId as string]).toBeDefined();
  });

  it('provides a detail card for every scored model', () => {
    expect(Object.keys(viewData.details).length).toBe(scores.models.length);
  });

  it('computes scatter geometry with a dot for every real model with an efficiency score', () => {
    expect(viewData.scatter.dots.length).toBe(
      viewData.realRows.filter((row) => row.efficiency != null).length,
    );
  });

  it('shows the run id in title, footer, and top bar chip', () => {
    expect(html).toContain(`Kansoku Trading Benchmark · ${runId}`);
    expect(viewData.runId).toBe(runId);
    expect(viewData.footer.runId).toBe(runId);
  });
});
