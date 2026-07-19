import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setModelsRuntimeForTests } from '@kansoku/core/ai/modelsRuntime';
import { unregisterProModuleForTests } from '@kansoku/core/pro/registry';
import { resetProtocolClaimForTests } from '@kansoku/core/pro/protocolClaim';

vi.mock('@kansoku/core/pro/editionLoader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kansoku/core/pro/editionLoader')>();
  return { ...actual, loadEdition: vi.fn(actual.loadEdition) };
});

const { initServerRuntime } = await import('../src/runtimeInit.js');
const { loadEdition } = await import('@kansoku/core/pro/editionLoader');

let tmpAppDir: string;

beforeEach(() => {
  tmpAppDir = mkdtempSync(join(tmpdir(), 'kansoku-server-runtime-init-'));
  vi.mocked(loadEdition).mockClear();
});

afterEach(() => {
  rmSync(tmpAppDir, { recursive: true, force: true });
  unregisterProModuleForTests();
  resetProtocolClaimForTests();
  setModelsRuntimeForTests(null);
});

describe('initServerRuntime: expectedPublicCommit wiring', () => {
  it('productionHost=true with an explicit opts.expectedPublicCommit passes that exact value', async () => {
    await initServerRuntime({
      proAppDir: tmpAppDir,
      productionHost: true,
      expectedPublicCommit: 'deadbeef',
    });

    expect(loadEdition).toHaveBeenCalledWith(
      expect.objectContaining({ expectedPublicCommit: 'deadbeef' }),
    );
  });

  it('productionHost=false passes expectedPublicCommit: undefined regardless of opts', async () => {
    await initServerRuntime({
      proAppDir: tmpAppDir,
      productionHost: false,
    });

    expect(loadEdition).toHaveBeenCalledWith(
      expect.objectContaining({ expectedPublicCommit: undefined }),
    );
  });
});
