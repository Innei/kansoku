import type { Constructor } from '@tsuki-hono/common';
import type { ProAiExtension } from '@kansoku/pro-api';

export interface ServerProComposition {
  modules: readonly Constructor[];
  aiExtension?: ProAiExtension;
  start?: () => Promise<void> | void;
}
