import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { IpcMethod, IpcService } from 'electron-ipc-decorator';
import { getDb } from '@kansoku/core/db/index';
import { dataRoot } from '../boot/env.js';
import { toEnvelope } from '../kernel/ipc/envelope.js';
import { ensureAgentKit } from './ensureAgentKit.js';
import { readManifest, type ManifestTemplate } from './manifest.js';
import {
  readState,
  removeConflict,
  removeUpdate,
  sha256,
  upsertTemplate,
  writeState,
  type AgentKitDataState,
} from './state.js';
import { defaultAgentKitStore } from './store.js';
import { acceptConflictWithTemplate, keepConflictOriginal, makeRender } from './templates.js';

function resourcesPath(): string {
  return process.resourcesPath;
}

function templateFor(dest: string): ManifestTemplate {
  const template = readManifest(resourcesPath()).templates.find((t) => t.dest === dest);
  if (!template) throw new Error(`agentKit: unknown template dest ${dest}`);
  return template;
}

function requireState(): AgentKitDataState {
  const state = readState(dataRoot);
  if (!state) throw new Error('agentKit: no state to act against');
  return state;
}

export class AgentKitIpc extends IpcService {
  static readonly groupName = 'agentKit';

  @IpcMethod()
  getStatus() {
    return toEnvelope('agentKit.getStatus', () => {
      const s = defaultAgentKitStore(app).read();
      const state = readState(dataRoot);
      return {
        enabled: s.enabled,
        lastSyncAt: s.lastSyncAt,
        kitVersion: state?.kitVersion,
        pendingConflicts: state?.pendingConflicts,
        pendingUpdates: state?.pendingUpdates,
      };
    });
  }

  @IpcMethod()
  setEnabled(input: { enabled: boolean }) {
    return toEnvelope('agentKit.setEnabled', async () => {
      const store = defaultAgentKitStore(app);
      if (!input.enabled) {
        store.write({ ...store.read(), enabled: false });
        return { enabled: false };
      }
      const result = await ensureAgentKit({ dataRoot, resourcesPath: resourcesPath(), db: getDb() });
      store.write({ ...store.read(), enabled: true, lastSyncAt: new Date().toISOString() });
      return { enabled: true, ...result };
    });
  }

  @IpcMethod()
  forceSync() {
    return toEnvelope('agentKit.forceSync', async () => {
      const result = await ensureAgentKit({ dataRoot, resourcesPath: resourcesPath(), db: getDb() });
      const store = defaultAgentKitStore(app);
      store.write({ ...store.read(), lastSyncAt: new Date().toISOString() });
      return result;
    });
  }

  @IpcMethod()
  resolveConflict(input: { dest: string; choice: 'use-template' | 'keep-original' }) {
    return toEnvelope('agentKit.resolveConflict', () => {
      const template = templateFor(input.dest);
      const state = requireState();
      const db = getDb();
      const templateState =
        input.choice === 'use-template'
          ? acceptConflictWithTemplate({
              template,
              resourcesPath: resourcesPath(),
              dataRoot,
              db,
              render: makeRender(resourcesPath(), db),
            })
          : keepConflictOriginal({ template, dataRoot });
      writeState(dataRoot, removeConflict(upsertTemplate(state, input.dest, templateState), input.dest));
      return { dest: input.dest };
    });
  }

  @IpcMethod()
  applyUpdate(input: { dest: string }) {
    return toEnvelope('agentKit.applyUpdate', () => {
      const template = templateFor(input.dest);
      const state = requireState();
      const db = getDb();
      const oldTemplateHash = state.templates[input.dest]?.sourceTemplateHash;
      const templateState = acceptConflictWithTemplate({
        template,
        resourcesPath: resourcesPath(),
        dataRoot,
        db,
        render: makeRender(resourcesPath(), db),
        backupSuffix: (oldTemplateHash ?? 'unknown').slice(0, 8),
      });
      writeState(dataRoot, removeUpdate(upsertTemplate(state, input.dest, templateState), input.dest));
      return { dest: input.dest };
    });
  }

  @IpcMethod()
  clean() {
    return toEnvelope('agentKit.clean', () => {
      const state = readState(dataRoot);
      if (state) {
        for (const [dest, templateState] of Object.entries(state.templates)) {
          if (templateState.kept) continue;
          const targetPath = join(dataRoot, dest);
          if (!existsSync(targetPath)) continue;
          if (sha256(readFileSync(targetPath)) === templateState.initialContentHash) {
            rmSync(targetPath, { force: true });
          }
        }
      }
      rmSync(join(dataRoot, '.kansoku-agent-kit'), { recursive: true, force: true });
      const store = defaultAgentKitStore(app);
      store.write({ ...store.read(), enabled: false });
      return { cleaned: true };
    });
  }
}
