import { beforeEach, describe, expect, it } from "vitest";
import {
  LEASE_GRACE_MS,
  acquireLease,
  activeLeaseSymbols,
  hasActiveLease,
  releaseLease,
  resetLeases,
} from "../src/ai/leases.js";

beforeEach(() => {
  resetLeases();
});

describe("leases", () => {
  it("acquire makes a symbol active and visible in activeLeaseSymbols", () => {
    acquireLease("MU.US");
    expect(hasActiveLease("MU.US")).toBe(true);
    expect(activeLeaseSymbols()).toContain("MU.US");
  });

  it("two acquires + one release stays active with no expiry pending", () => {
    const t0 = 1_000_000;
    acquireLease("MU.US");
    acquireLease("MU.US");
    releaseLease("MU.US", t0);
    expect(hasActiveLease("MU.US", t0 + LEASE_GRACE_MS + 1)).toBe(true);
  });

  it("release to zero enters grace: active within 90s, inactive after", () => {
    const t0 = 1_000_000;
    acquireLease("MU.US");
    releaseLease("MU.US", t0);
    expect(hasActiveLease("MU.US", t0 + LEASE_GRACE_MS - 1)).toBe(true);
    expect(hasActiveLease("MU.US", t0 + LEASE_GRACE_MS + 1)).toBe(false);
  });

  it("re-acquiring during grace restores it, and a later release restarts a fresh grace window", () => {
    const t0 = 1_000_000;
    acquireLease("MU.US");
    releaseLease("MU.US", t0);
    expect(hasActiveLease("MU.US", t0 + 1000)).toBe(true);

    acquireLease("MU.US");
    expect(hasActiveLease("MU.US", t0 + LEASE_GRACE_MS + 1)).toBe(true);

    const t1 = t0 + 50_000;
    releaseLease("MU.US", t1);
    expect(hasActiveLease("MU.US", t1 + LEASE_GRACE_MS - 1)).toBe(true);
    expect(hasActiveLease("MU.US", t1 + LEASE_GRACE_MS + 1)).toBe(false);
  });

  it("releasing an unknown symbol is a no-op", () => {
    expect(() => releaseLease("GHOST.US")).not.toThrow();
    expect(hasActiveLease("GHOST.US")).toBe(false);
  });

  it("purges expired entries from activeLeaseSymbols", () => {
    const t0 = 1_000_000;
    acquireLease("MU.US");
    releaseLease("MU.US", t0);
    expect(activeLeaseSymbols(t0 + LEASE_GRACE_MS + 1)).not.toContain("MU.US");
  });

  it("normalizes symbol casing consistently", () => {
    acquireLease("nvda");
    expect(hasActiveLease("NVDA")).toBe(true);
    expect(activeLeaseSymbols()).toContain("NVDA");
  });
});
