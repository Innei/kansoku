import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const childProcess = vi.hoisted(() => ({
  execFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: childProcess.execFile,
}));

async function loadProvider() {
  const { longbridgeProvider } = await import("../src/services/marketdata/longbridge.js");
  return longbridgeProvider;
}

describe("longbridgeProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T00:00:00Z"));
    childProcess.execFile.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caps a failing burst at the concurrency limit and suppresses the overflow", async () => {
    const pending: Array<() => void> = [];
    childProcess.execFile.mockImplementation((_cmd, _args, _opts, cb) => {
      pending.push(() => cb(new Error("auth required")));
    });
    const provider = await loadProvider();
    const tick = async (n = 20) => {
      for (let i = 0; i < n; i++) await Promise.resolve();
    };

    const settled = Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => provider.getKline(`S${i}.US`, "5m", 1)),
    );
    await tick();

    expect(childProcess.execFile).toHaveBeenCalledTimes(4);
    while (pending.length) pending.shift()!();
    const results = await settled;

    expect(childProcess.execFile).toHaveBeenCalledTimes(4);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(6);
    const messages = results.map((r) => (r.status === "rejected" ? String(r.reason.message) : ""));
    expect(messages.filter((m) => m.includes("failed"))).toHaveLength(4);
    expect(messages.filter((m) => m.includes("skipped after recent failure"))).toHaveLength(2);
  });

  it("keeps the circuit closed until the cooldown expires", async () => {
    childProcess.execFile.mockImplementationOnce((_cmd, _args, _opts, cb) => {
      cb(new Error("auth required"));
    });
    const provider = await loadProvider();

    await expect(provider.getPositions!()).rejects.toThrow("failed");
    await expect(provider.getQuotes(["MRVL.US"])).rejects.toThrow("skipped after recent failure");
    expect(childProcess.execFile).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-07-05T00:02:01Z"));
    childProcess.execFile.mockImplementationOnce((_cmd, _args, _opts, cb) => {
      cb(null, "[{\"symbol\":\"MRVL.US\"}]", "");
    });

    await expect(provider.getQuotes(["MRVL.US"])).resolves.toEqual([{ symbol: "MRVL.US" }]);
    expect(childProcess.execFile).toHaveBeenCalledTimes(2);
  });

  it("runs healthy calls with bounded concurrency instead of one at a time", async () => {
    const pending: Array<(out: string) => void> = [];
    let inFlight = 0;
    let peak = 0;
    childProcess.execFile.mockImplementation((_cmd, _args, _opts, cb) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      pending.push((out) => {
        inFlight--;
        cb(null, out, "");
      });
    });
    const provider = await loadProvider();
    const tick = async (n = 20) => {
      for (let i = 0; i < n; i++) await Promise.resolve();
    };

    const settled = Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => provider.getKline(`S${i}.US`, "5m", 1)),
    );
    await tick();

    expect(peak).toBe(4);
    expect(childProcess.execFile).toHaveBeenCalledTimes(4);

    while (pending.length) {
      pending.shift()!("[]");
      await tick();
    }
    await settled;
    expect(childProcess.execFile).toHaveBeenCalledTimes(6);
  });

  it("flattens watchlist groups into a deduped symbol list", async () => {
    childProcess.execFile.mockImplementationOnce((_cmd, _args, _opts, cb) => {
      cb(
        null,
        JSON.stringify([
          { securities: [{ symbol: "MU.US" }, { symbol: "NVDA.US" }] },
          { securities: [{ symbol: "MU.US" }] },
          {},
        ]),
        "",
      );
    });
    const provider = await loadProvider();

    await expect(provider.getWatchlistSymbols!()).resolves.toEqual(["MU.US", "NVDA.US"]);
  });
});
