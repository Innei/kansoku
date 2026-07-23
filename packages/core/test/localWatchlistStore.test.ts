import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/index.js';
import {
  createLocalWatchlistStore,
  getActiveLocalWatchlistStore,
  getLocalWatchlistOrDefault,
  setActiveLocalWatchlistStore,
  validateLocalWatchlist,
} from '../src/marketdata/localWatchlistStore.js';

function tempDbPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'local-watchlist-store-'));
  return { dir, path: join(dir, 'app.db') };
}

describe('validateLocalWatchlist', () => {
  it('rejects a non-array', () => {
    expect(() => validateLocalWatchlist('MU')).toThrow();
    expect(() => validateLocalWatchlist(null)).toThrow();
  });

  it('allows an empty array', () => {
    expect(validateLocalWatchlist([])).toEqual([]);
  });

  it('normalizes bare tickers to the .US suffix', () => {
    expect(validateLocalWatchlist(['mu'])).toEqual(['MU.US']);
  });

  it('preserves multi-dot canonical symbols', () => {
    expect(validateLocalWatchlist(['BRK.B'])).toEqual(['BRK.B']);
  });

  it('dedupes while preserving first-occurrence order', () => {
    expect(validateLocalWatchlist(['MU', 'mu', 'NVDA'])).toEqual(['MU.US', 'NVDA.US']);
  });

  it('rejects an invalid symbol', () => {
    expect(() => validateLocalWatchlist(['not a symbol!'])).toThrow();
  });
});

describe('createLocalWatchlistStore', () => {
  it('defaults to [] when no row exists', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      expect(store.get()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('round-trips a set value and persists across store instances', () => {
    const { dir, path } = tempDbPath();
    try {
      const db1 = createDb(path);
      const store1 = createLocalWatchlistStore(db1);
      store1.set(['MU', 'NVDA']);
      expect(store1.get()).toEqual(['MU.US', 'NVDA.US']);

      const store2 = createLocalWatchlistStore(createDb(path));
      expect(store2.get()).toEqual(['MU.US', 'NVDA.US']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows clearing via an empty set()', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      store.set(['MU']);
      expect(store.get()).toEqual(['MU.US']);
      store.set([]);
      expect(store.get()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid symbol and leaves the store unchanged', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      expect(() => store.set(['not a symbol!'])).toThrow();
      expect(store.get()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns a defensive copy from get()', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      store.set(['MU']);
      const symbols = store.get();
      symbols.push('NVDA.US');
      expect(store.get()).toEqual(['MU.US']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bumps revision on write', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      expect(store.revision()).toBe(0);
      store.set(['MU']);
      expect(store.revision()).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('getActiveLocalWatchlistStore / setActiveLocalWatchlistStore', () => {
  afterEach(() => setActiveLocalWatchlistStore(null));

  it('throws with a clear message when unset', () => {
    setActiveLocalWatchlistStore(null);
    expect(() => getActiveLocalWatchlistStore()).toThrow(/local-watchlist store/i);
  });

  it('returns the store set via setActiveLocalWatchlistStore', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      setActiveLocalWatchlistStore(store);
      expect(getActiveLocalWatchlistStore()).toBe(store);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('getLocalWatchlistOrDefault', () => {
  afterEach(() => setActiveLocalWatchlistStore(null));

  it('falls back to [] with no active store', () => {
    setActiveLocalWatchlistStore(null);
    expect(getLocalWatchlistOrDefault()).toEqual([]);
  });

  it('reads through the active store', () => {
    const { dir, path } = tempDbPath();
    try {
      const store = createLocalWatchlistStore(createDb(path));
      store.set(['MU']);
      setActiveLocalWatchlistStore(store);
      expect(getLocalWatchlistOrDefault()).toEqual(['MU.US']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
