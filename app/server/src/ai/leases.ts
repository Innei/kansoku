export const LEASE_GRACE_MS = 90_000;

type LeaseState = { count: number; expiresAt: number | null };

const leases = new Map<string, LeaseState>();

function key(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isActive(state: LeaseState | undefined, now: number): boolean {
  if (!state) return false;
  if (state.count > 0) return true;
  return state.expiresAt != null && state.expiresAt > now;
}

export function acquireLease(symbol: string): void {
  const k = key(symbol);
  const state = leases.get(k);
  if (!state) {
    leases.set(k, { count: 1, expiresAt: null });
    return;
  }
  state.count += 1;
  state.expiresAt = null;
}

export function releaseLease(symbol: string, now: number = Date.now()): void {
  const k = key(symbol);
  const state = leases.get(k);
  if (!state) return;
  state.count = Math.max(0, state.count - 1);
  if (state.count === 0) {
    state.expiresAt = now + LEASE_GRACE_MS;
  }
}

export function hasActiveLease(symbol: string, now: number = Date.now()): boolean {
  const k = key(symbol);
  const state = leases.get(k);
  if (!isActive(state, now)) {
    if (state) leases.delete(k);
    return false;
  }
  return true;
}

export function activeLeaseSymbols(now: number = Date.now()): string[] {
  const result: string[] = [];
  for (const [k, state] of [...leases]) {
    if (isActive(state, now)) {
      result.push(k);
    } else {
      leases.delete(k);
    }
  }
  return result;
}

export function resetLeases(): void {
  leases.clear();
}
