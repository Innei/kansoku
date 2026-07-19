import { basename, dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  proPackageJsonExists: true,
  encFileExists: true,
  spawnStatus: 0,
};

const dirs = new Map<string, Set<string>>();

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: state.spawnStatus })),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => {
    if (path.endsWith(join('pro', 'package.json'))) return state.proPackageJsonExists;
    if (path.endsWith(join('dist-enc', 'pro.enc'))) return state.encFileExists;
    return false;
  }),
  rmSync: vi.fn((path: string) => {
    dirs.delete(path);
  }),
  mkdirSync: vi.fn((path: string) => {
    dirs.set(path, new Set());
  }),
  cpSync: vi.fn((src: string, dest: string) => {
    const dir = dirname(dest);
    const existing = dirs.get(dir) ?? new Set<string>();
    existing.add(basename(dest));
    dirs.set(dir, existing);
  }),
  readdirSync: vi.fn((path: string) => Array.from(dirs.get(path) ?? [])),
}));

const destDir = join(import.meta.dirname, '..', '..', 'pro');

class ProcessExitSignal extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

async function runStagePro() {
  vi.resetModules();
  try {
    // @ts-expect-error stagePro.mjs is a plain untyped script, not a module under rootDir
    await import('../../scripts/stagePro.mjs');
  } catch (error) {
    if (!(error instanceof ProcessExitSignal)) throw error;
  }
}

describe('stagePro.mjs', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dirs.clear();
    state.proPackageJsonExists = true;
    state.encFileExists = true;
    state.spawnStatus = 0;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ProcessExitSignal(code);
    }) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('stages exactly one pro.enc file into destDir when apps/pro releases successfully', async () => {
    await runStagePro();

    const { readdirSync } = await import('node:fs');
    expect(readdirSync(destDir)).toEqual(['pro.enc']);
  });

  it('never creates destDir on the free-build path (apps/pro absent)', async () => {
    state.proPackageJsonExists = false;

    await runStagePro();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(dirs.has(destDir)).toBe(false);
  });

  it('exits with the release status without staging anything when pnpm release fails', async () => {
    state.spawnStatus = 1;

    await runStagePro();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(dirs.has(destDir)).toBe(false);
  });
});
