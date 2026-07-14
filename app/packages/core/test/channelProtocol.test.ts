import { describe, expect, it } from "vitest";
import { parseWsMessage } from "../src/realtime/channelProtocol.js";

describe("parseWsMessage preview kind", () => {
  it("parses a valid preview subscription", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "preview", symbol: "QQQ.US" })).toEqual({
      op: "sub",
      key: "k1",
      kind: "preview",
      symbol: "QQQ.US",
    });
  });

  it("rejects a missing symbol", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "preview" })).toBeNull();
  });

  it("rejects an empty symbol", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "preview", symbol: "" })).toBeNull();
  });
});

describe("parseWsMessage annotations kind", () => {
  it("parses a valid annotations subscription", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "annotations", symbol: "NVDA.US" })).toEqual({
      op: "sub",
      key: "k1",
      kind: "annotations",
      symbol: "NVDA.US",
    });
  });

  it("rejects a missing symbol", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "annotations" })).toBeNull();
  });

  it("rejects an empty symbol", () => {
    expect(parseWsMessage({ op: "sub", key: "k1", kind: "annotations", symbol: "" })).toBeNull();
  });
});
