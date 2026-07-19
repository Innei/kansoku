import { afterEach, describe, expect, it } from 'vitest';
import type { ProModule } from '@kansoku/pro-api';
import { prepareProAiTurn } from '../src/pro/aiExtension.js';
import {
  DisabledDeepDiveService,
  DisabledFollowAutomation,
  EmptyAiTurnPipeline,
} from '../src/pro/domain/defaultImplementations.js';
import {
  LegacyAiTurnPipeline,
  LegacyDeepDiveService,
  LegacyEditionRuntimeStatusReader,
  LegacyFollowAutomation,
} from '../src/pro/domain/legacyAdapters.js';
import {
  freeHooks,
  registerProModule,
  setEncBundlePresent,
  unregisterProModuleForTests,
} from '../src/pro/registry.js';

afterEach(() => {
  unregisterProModuleForTests();
  setEncBundlePresent(false);
});

describe('default-edition implementations match today\'s free behavior', () => {
  it('DisabledFollowAutomation matches freeHooks.requestImmediateFollow', () => {
    expect(new DisabledFollowAutomation().requestImmediateFollow('AAPL')).toBe(
      freeHooks.requestImmediateFollow('AAPL'),
    );
  });

  it('DisabledDeepDiveService matches freeHooks deep-dive fields', () => {
    const service = new DisabledDeepDiveService();
    expect(service.startDeepDiveForNote('note')).toEqual(freeHooks.startDeepDiveForNote('note'));
    expect(service.deepDiveStatus()).toEqual(freeHooks.deepDiveStatus());
  });

  it('EmptyAiTurnPipeline matches prepareProAiTurn no-extension fallback', async () => {
    const context = { surface: 'assistant' as const, sessionId: 's1' };
    const fromPipeline = await new EmptyAiTurnPipeline().prepareTurn(context);
    const fromLegacyFn = await prepareProAiTurn(context);
    expect(fromPipeline).toEqual({ readMounts: [], processors: [] });
    expect(fromPipeline).toEqual(fromLegacyFn);
  });
});

describe('legacy adapters delegate to the registered pro module', () => {
  it('LegacyFollowAutomation delegates to getProHooks().requestImmediateFollow', async () => {
    const calls: string[] = [];
    const fakeModule: ProModule = {
      hooks: {
        requestImmediateFollow: (symbol) => {
          calls.push(symbol);
        },
        startDeepDiveForNote: () => ({ started: false, reason: 'disabled' }),
        deepDiveStatus: () => ({ running: false }),
      },
    };
    registerProModule(fakeModule);
    await new LegacyFollowAutomation().requestImmediateFollow('MU');
    expect(calls).toEqual(['MU']);
  });

  it('LegacyDeepDiveService delegates to getProHooks() deep-dive methods', () => {
    const fakeModule: ProModule = {
      hooks: {
        requestImmediateFollow: () => {},
        startDeepDiveForNote: (note) => ({ started: true, note } as never),
        deepDiveStatus: () => ({ running: true, symbol: 'MU' }),
      },
    };
    registerProModule(fakeModule);
    const service = new LegacyDeepDiveService();
    expect(service.startDeepDiveForNote('note')).toEqual({ started: true, note: 'note' });
    expect(service.deepDiveStatus()).toEqual({ running: true, symbol: 'MU' });
  });

  it('LegacyAiTurnPipeline delegates to prepareProAiTurn via the registered aiExtension', async () => {
    const fakeModule: ProModule = {
      hooks: freeHooks,
      aiExtension: {
        prepareTurn: async () => ({ promptContext: 'ctx', readMounts: [] }),
      },
    };
    registerProModule(fakeModule);
    const context = { surface: 'assistant' as const, sessionId: 's1' };
    const result = await new LegacyAiTurnPipeline().prepareTurn(context);
    expect(result.readMounts).toEqual([]);
    expect(result.processors).toHaveLength(1);
  });
});

describe('LegacyEditionRuntimeStatusReader.status', () => {
  it('reports absent when no pro module and no enc bundle', () => {
    const reader = new LegacyEditionRuntimeStatusReader();
    expect(reader.status).toEqual({ state: 'absent', bundlePresent: false, keyId: undefined });
  });

  it('reports locked when only the enc bundle is present', () => {
    setEncBundlePresent(true);
    const reader = new LegacyEditionRuntimeStatusReader();
    expect(reader.status).toEqual({ state: 'locked', bundlePresent: true, keyId: undefined });
  });

  it('reports active when a pro module is registered', () => {
    registerProModule({ hooks: freeHooks });
    const reader = new LegacyEditionRuntimeStatusReader();
    expect(reader.status).toEqual({ state: 'active', bundlePresent: false, keyId: undefined });
  });

  it('reports active with bundlePresent true when both pro module and enc bundle are present', () => {
    setEncBundlePresent(true);
    registerProModule({ hooks: freeHooks });
    const reader = new LegacyEditionRuntimeStatusReader();
    expect(reader.status).toEqual({ state: 'active', bundlePresent: true, keyId: undefined });
  });
});
