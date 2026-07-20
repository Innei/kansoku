import type { ProChannel } from '@kansoku/pro-api';

let activeChannels: readonly ProChannel[] = [];

export function registerProChannels(channels: readonly ProChannel[]): void {
  activeChannels = channels;
}

export function resetProChannelsForTests(): void {
  activeChannels = [];
}

export function currentProChannels(): readonly ProChannel[] {
  return activeChannels;
}
