import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { localWatchlistSettings } from '../db/schema.js';
import { ClientError } from '../platform/errors.js';
import { normalizeSymbol } from '../symbols/symbol.utils.js';

export interface LocalWatchlistStore {
  get(): string[];
  set(symbols: string[]): void;
  revision(): number;
}

export const DEFAULT_LOCAL_WATCHLIST: string[] = [];

export function validateLocalWatchlist(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new ClientError('"symbols" must be an array of tickers', 'e.g. ["MU", "NVDA"]');
  }
  const deduped: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      throw new ClientError(`invalid symbol: ${String(item)}`, 'e.g. MU or MU.US');
    }
    const normalized = normalizeSymbol(item);
    if (!deduped.includes(normalized)) deduped.push(normalized);
  }
  return deduped;
}

export function createLocalWatchlistStore(db: Db): LocalWatchlistStore {
  let rev = 0;

  const row = db
    .select()
    .from(localWatchlistSettings)
    .where(eq(localWatchlistSettings.id, 1))
    .get();
  let cache: string[] = row ? row.symbols : DEFAULT_LOCAL_WATCHLIST;

  return {
    get(): string[] {
      return [...cache];
    },

    set(symbols: string[]): void {
      const validated = validateLocalWatchlist(symbols);
      const updatedAt = new Date().toISOString();

      db.insert(localWatchlistSettings)
        .values({ id: 1, symbols: validated, updatedAt })
        .onConflictDoUpdate({
          target: localWatchlistSettings.id,
          set: { symbols: validated, updatedAt },
        })
        .run();

      cache = validated;
      rev += 1;
    },

    revision(): number {
      return rev;
    },
  };
}

let active: LocalWatchlistStore | null = null;

export function setActiveLocalWatchlistStore(store: LocalWatchlistStore | null): void {
  active = store;
}

export function getActiveLocalWatchlistStore(): LocalWatchlistStore {
  if (!active) {
    throw new Error(
      'localWatchlistStore: no active local-watchlist store; call setActiveLocalWatchlistStore before use',
    );
  }
  return active;
}

export function getLocalWatchlistOrDefault(): string[] {
  return active ? active.get() : DEFAULT_LOCAL_WATCHLIST;
}
