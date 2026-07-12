import { describe, expect, it, vi } from "vitest";
import { CandleAggregator } from "../src/services/marketdata/candleAggregator.js";

describe("CandleAggregator", () => {
  it("merges same-bucket trades and opens a later bucket", () => {
    const emit = vi.fn();
    const aggregator = new CandleAggregator(emit);
    aggregator.seed("AAPL.US", "5m", {
      time: "2026-07-10T14:30:00.000Z",
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 10,
    });

    aggregator.handleTrades({
      symbol: "AAPL.US",
      sequence: 1,
      trades: [{ price: 102, volume: 3, timestamp: Date.parse("2026-07-10T14:31:00.000Z") / 1000, tradeSession: 0 }],
    });
    expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ high: 102, close: 102, volume: 13 }));

    aggregator.handleTrades({
      symbol: "AAPL.US",
      sequence: 2,
      trades: [{ price: 103, volume: 2, timestamp: Date.parse("2026-07-10T14:36:00.000Z") / 1000, tradeSession: 0 }],
    });
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({ ts: Date.parse("2026-07-10T14:35:00.000Z"), open: 103, close: 103, volume: 2 }),
    );
  });

  it("uses quotes to update price without double-counting volume and ignores old data", () => {
    const emit = vi.fn();
    const aggregator = new CandleAggregator(emit);
    aggregator.seed(".IXIC.US", "15m", {
      time: "2026-07-10T14:30:00.000Z",
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 5,
    });
    aggregator.handleQuote({
      symbol: ".IXIC.US",
      sequence: 1,
      lastDone: 101,
      timestamp: Date.parse("2026-07-10T14:35:00.000Z") / 1000,
      volume: 100,
      currentVolume: 10,
      turnover: 0,
      currentTurnover: 0,
      tradeSession: 0,
      tag: 0,
    });
    expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ close: 101, volume: 5 }));

    emit.mockClear();
    aggregator.handleTrades({
      symbol: ".IXIC.US",
      sequence: 2,
      trades: [{ price: 90, volume: 1, timestamp: Date.parse("2026-07-10T14:00:00.000Z") / 1000, tradeSession: 0 }],
    });
    expect(emit).not.toHaveBeenCalled();
  });
});

