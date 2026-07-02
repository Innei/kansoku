import { describe, expect, it } from "vitest";
import { mergeForPatch } from "../src/services/build.js";

describe("mergeForPatch intraday", () => {
  it("merges session so a cash-session PATCH persists", () => {
    const input = { symbol: "MRVL.US", session: "all", prediction: null };
    const merged = mergeForPatch("intraday", input, { session: "intraday", refresh: true });
    expect(merged.session).toBe("intraday");
  });

  it("keeps existing session when the PATCH omits it", () => {
    const input = { symbol: "MRVL.US", session: "intraday" };
    const merged = mergeForPatch("intraday", input, { prediction: { direction: "long" } });
    expect(merged.session).toBe("intraday");
  });
});
