import { getLocalWatchlistOrDefault } from './localWatchlistStore.js';
import type { MarketDataProvider } from './types.js';

export async function watchlistSymbols(provider: MarketDataProvider): Promise<string[]> {
  if (provider.getWatchlistSymbols) {
    return provider.getWatchlistSymbols();
  }
  return getLocalWatchlistOrDefault();
}
