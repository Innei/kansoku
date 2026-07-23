import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import {
  createLocalWatchlistStore,
  setActiveLocalWatchlistStore,
} from '../src/marketdata/localWatchlistStore.js';
import { settingsService } from '../src/settings/settings.service.js';

function tempDbPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'local-watchlist-settings-service-'));
  return { dir, path: join(dir, 'app.db') };
}

describe('settingsService local watchlist', () => {
  afterEach(() => setActiveLocalWatchlistStore(null));

  it('round-trips a valid symbol list through get/put', async () => {
    const { dir, path } = tempDbPath();
    try {
      setActiveLocalWatchlistStore(createLocalWatchlistStore(createDb(path)));

      expect(await settingsService.getLocalWatchlist()).toEqual({ symbols: [] });

      const put = await settingsService.putLocalWatchlist({ symbols: ['mu', 'nvda'] });
      expect(put).toEqual({ symbols: ['MU.US', 'NVDA.US'] });

      expect(await settingsService.getLocalWatchlist()).toEqual({ symbols: ['MU.US', 'NVDA.US'] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid symbol with a ClientError', async () => {
    const { dir, path } = tempDbPath();
    try {
      setActiveLocalWatchlistStore(createLocalWatchlistStore(createDb(path)));

      await expect(
        settingsService.putLocalWatchlist({ symbols: ['not a symbol!'] }),
      ).rejects.toMatchObject({ name: 'ClientError' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
