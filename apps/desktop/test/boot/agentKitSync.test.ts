import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).__DESKTOP_DEV__ = false;

vi.mock('electron', () => ({
  app: {
    setName: vi.fn(),
    getPath: vi.fn(() => '/tmp/agent-kit-boot-smoke'),
    isPackaged: false,
  },
}));

vi.mock('../../src/data/dataRoot/status.js', () => ({ buildDataRootStatus: vi.fn(() => ({})) }));
vi.mock('../../src/data/dataRoot/usability.js', () => ({ isDataRootUsable: vi.fn(() => false) }));
vi.mock('../../src/boot/paths.js', () => ({
  resolveDataRoot: vi.fn(() => '/tmp/agent-kit-boot-smoke-root'),
  scaffoldDataRoot: vi.fn(),
}));
vi.mock('../../src/boot/skills.js', () => ({
  bundledSkillsPath: vi.fn(() => '/tmp/agent-kit-boot-smoke-skills'),
  ensureBundledSkills: vi.fn(),
}));

const store = vi.hoisted(() => ({ read: vi.fn(() => ({ enabled: true })), write: vi.fn() }));
vi.mock('../../src/agent-kit/store.js', () => ({ defaultAgentKitStore: () => store }));

const ensureAgentKit = vi.hoisted(() => vi.fn(async () => ({ conflicts: [], updates: [] })));
vi.mock('../../src/agent-kit/ensureAgentKit.js', () => ({ ensureAgentKit }));

const getDb = vi.hoisted(() => vi.fn(() => ({})));
vi.mock('@kansoku/core/db/index', () => ({ getDb }));

beforeEach(() => {
  store.read.mockReset().mockReturnValue({ enabled: true });
  ensureAgentKit.mockClear();
  getDb.mockClear();
});

describe('boot/env agent-kit sync', () => {
  it('runs ensureAgentKit at boot when the store reports enabled', async () => {
    vi.resetModules();
    await import('../../src/boot/env.js');
    await vi.waitFor(() => expect(ensureAgentKit).toHaveBeenCalledTimes(1));
    expect(getDb).toHaveBeenCalledTimes(1);
  });

  it('skips ensureAgentKit when the store reports disabled', async () => {
    store.read.mockReturnValue({ enabled: false });
    vi.resetModules();
    await import('../../src/boot/env.js');
    await new Promise((resolve) => setImmediate(resolve));
    expect(ensureAgentKit).not.toHaveBeenCalled();
  });

  it('does not throw when ensureAgentKit rejects', async () => {
    ensureAgentKit.mockRejectedValueOnce(new Error('sync failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
    await expect(import('../../src/boot/env.js')).resolves.toBeDefined();
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[agent-kit] boot sync failed', expect.any(Error)));
    errorSpy.mockRestore();
  });
});
