import type { ProHooks } from '@kansoku/pro-api';

export const freeHooks: ProHooks = {
  requestImmediateFollow() {},
  startDeepDiveForNote() {
    return { started: false, reason: 'disabled' };
  },
  deepDiveStatus() {
    return { running: false };
  },
};

let activeHooks: ProHooks = freeHooks;

export function registerProHooks(hooks: ProHooks): void {
  activeHooks = hooks;
}

export function resetProHooksForTests(): void {
  activeHooks = freeHooks;
}

export function currentProHooks(): ProHooks {
  return activeHooks;
}
