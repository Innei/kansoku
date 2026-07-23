import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import {
  createLocalWatchlistStore,
  setActiveLocalWatchlistStore,
} from '../src/marketdata/localWatchlistStore.js';
import type { MarketDataProvider } from '../src/marketdata/types.js';
import { watchlistSymbols } from '../src/marketdata/watchlist.js';

function tempDbPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'watchlist-fallback-'));
  return { dir, path: join(dir, 'app.db') };
}

describe('watchlistSymbols', () => {
  afterEach(() => setActiveLocalWatchlistStore(null));

  it('uses the provider method when present, ignoring a non-empty local store', async () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      store.set(['LOCAL']);
      setActiveLocalWatchlistStore(store);

      const provider: Partial<MarketDataProvider> = {
        getWatchlistSymbols: async () => ['NVDA.US', 'MU.US'],
      };
      const symbols = await watchlistSymbols(provider as MarketDataProvider);
      expect(symbols).toEqual(['NVDA.US', 'MU.US']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads the local store when the provider has no getWatchlistSymbols', async () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      store.set(['NVDA', 'MU']);
      setActiveLocalWatchlistStore(store);

      const provider: Partial<MarketDataProvider> = {};
      const symbols = await watchlistSymbols(provider as MarketDataProvider);
      expect(symbols).toEqual(['NVDA.US', 'MU.US']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to [] when the provider has no method and no local store is active', async () => {
    setActiveLocalWatchlistStore(null);
    const provider: Partial<MarketDataProvider> = {};
    expect(await watchlistSymbols(provider as MarketDataProvider)).toEqual([]);
  });

  it('propagates an error thrown by the provider method rather than swallowing it', async () => {
    const provider: Partial<MarketDataProvider> = {
      getWatchlistSymbols: async () => {
        throw new Error('upstream failure');
      },
    };
    await expect(watchlistSymbols(provider as MarketDataProvider)).rejects.toThrow(
      'upstream failure',
    );
  });
});
