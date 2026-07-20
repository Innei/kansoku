import type { IpcServiceConstructor } from 'electron-ipc-decorator';
import type { ProAiExtension, ProChannel, ProHooks } from '@kansoku/pro-api';

export interface DesktopProComposition {
  ipcServices: readonly IpcServiceConstructor[];
  realtimeChannels: readonly ProChannel[];
  hooks?: ProHooks;
  aiExtension?: ProAiExtension;
  start?: () => Promise<void> | void;
  dispose?: () => Promise<void> | void;
}
