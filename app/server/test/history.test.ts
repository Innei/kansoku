import { describe, expect, it } from "vitest";
import { clampViewCount, INTRADAY_MAX_COUNT } from "../src/services/history.js";

describe("clampViewCount", () => {
  it("parses a positive integer", () => {
    expect(clampViewCount("300")).toBe(300);
  });

  it("floors fractional values", () => {
    expect(clampViewCount("300.9")).toBe(300);
  });

  it("clamps to INTRADAY_MAX_COUNT", () => {
    expect(clampViewCount("5000")).toBe(INTRADAY_MAX_COUNT);
  });

  it("returns null for missing, empty, zero, negative, and non-numeric input", () => {
    expect(clampViewCount(undefined)).toBeNull();
    expect(clampViewCount("")).toBeNull();
    expect(clampViewCount("0")).toBeNull();
    expect(clampViewCount("-5")).toBeNull();
    expect(clampViewCount("abc")).toBeNull();
  });
});
