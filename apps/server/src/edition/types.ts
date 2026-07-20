import type { Constructor } from '@tsuki-hono/common';

export interface ServerProComposition {
  modules: readonly Constructor[];
  start?: () => Promise<void> | void;
}
