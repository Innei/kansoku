import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveProOverlayId } from '../src/index.js';

const { join } = path;

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function overlayFixture() {
  const root = mkdtempSync(join(tmpdir(), 'kansoku-overlay-'));
  roots.push(root);
  const publicDir = join(root, 'public');
  const privateDir = join(root, 'private');
  mkdirSync(publicDir);
  mkdirSync(privateDir);
  const importer = join(publicDir, 'entry.ts');
  const target = join(privateDir, 'edition.pro.ts');
  const projection = join(publicDir, 'edition.pro.ts');
  writeFileSync(importer, '');
  writeFileSync(target, 'export const edition = "pro";');
  symlinkSync(target, projection);
  return { importer, projection };
}

describe('resolveProOverlayId', () => {
  it('prefers the colocated projection for an explicit .js import', () => {
    const fixture = overlayFixture();
    expect(resolveProOverlayId('./edition.js', fixture.importer)).toBe(fixture.projection);
  });

  it('preserves a Vite query on the projected path', () => {
    const fixture = overlayFixture();
    expect(resolveProOverlayId('./edition.js?raw', fixture.importer)).toBe(
      `${fixture.projection}?raw`,
    );
  });

  it('leaves OSS, package, and already-pro imports alone', () => {
    const fixture = overlayFixture();
    expect(resolveProOverlayId('./edition.js', fixture.importer, { enabled: false })).toBeNull();
    expect(resolveProOverlayId('@kansoku/core', fixture.importer)).toBeNull();
    expect(resolveProOverlayId('./edition.pro.js', fixture.importer)).toBeNull();
  });

  it('does not treat an untracked regular .pro file as a managed projection', () => {
    const root = mkdtempSync(join(tmpdir(), 'kansoku-overlay-'));
    roots.push(root);
    const importer = join(root, 'entry.ts');
    writeFileSync(importer, '');
    writeFileSync(join(root, 'edition.pro.ts'), 'export const edition = "local";');
    expect(resolveProOverlayId('./edition.js', importer)).toBeNull();
  });
});
