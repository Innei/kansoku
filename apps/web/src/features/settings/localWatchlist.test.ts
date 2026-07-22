import { describe, expect, it } from 'vitest';
import { addSymbol, removeSymbol } from './localWatchlist';

describe('addSymbol', () => {
  it('trims, uppercases and canonicalizes to the server form', () => {
    expect(addSymbol([], '  mu  ')).toEqual(['MU.US']);
  });

  it('keeps an explicit market suffix as-is', () => {
    expect(addSymbol([], '700.hk')).toEqual(['700.HK']);
  });

  it('rejects an empty or whitespace-only input', () => {
    expect(addSymbol(['MU.US'], '   ')).toEqual(['MU.US']);
    expect(addSymbol(['MU.US'], '')).toEqual(['MU.US']);
  });

  it('rejects an invalid input', () => {
    expect(addSymbol([], '!!!')).toEqual([]);
  });

  it('rejects a duplicate already in the list, case- and suffix-insensitively', () => {
    expect(addSymbol(['MU.US'], 'mu')).toEqual(['MU.US']);
    expect(addSymbol(['MU.US'], 'MU.US')).toEqual(['MU.US']);
  });

  it('appends a new canonicalized symbol to the end of the list', () => {
    expect(addSymbol(['MU.US'], 'nvda')).toEqual(['MU.US', 'NVDA.US']);
  });
});

describe('removeSymbol', () => {
  it('removes the matching symbol', () => {
    expect(removeSymbol(['MU.US', 'NVDA.US'], 'MU.US')).toEqual(['NVDA.US']);
  });

  it('is a no-op when the symbol is absent', () => {
    expect(removeSymbol(['MU.US'], 'NVDA.US')).toEqual(['MU.US']);
  });
});
