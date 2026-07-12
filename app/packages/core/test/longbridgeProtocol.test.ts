import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  decodePacket,
  decodePushQuote,
  decodePushTrades,
  encodeRequest,
  encodeSubscribeRequest,
} from "../src/services/marketdata/longbridgeProtocol.js";

const bytes = (...values: number[]) => Uint8Array.from(values);

function str(field: number, value: string): number[] {
  const body = [...Buffer.from(value)];
  return [(field << 3) | 2, body.length, ...body];
}

function num(field: number, value: number): number[] {
  return [field << 3, value];
}

describe("Longbridge realtime protocol", () => {
  it("encodes request packet fields in network byte order", () => {
    expect([...encodeRequest(6, 0x01020304, 5000, bytes(1, 2))]).toEqual([
      1, 6, 1, 2, 3, 4, 0x13, 0x88, 0, 0, 2, 1, 2,
    ]);
  });

  it("decodes response and gzip push packets", () => {
    const response = decodePacket(bytes(2, 6, 0, 0, 0, 7, 0, 0, 0, 1, 9));
    expect(response).toEqual({ type: "response", command: 6, requestId: 7, status: 0, body: bytes(9) });

    const zipped = gzipSync(bytes(1, 2, 3));
    const push = decodePacket(bytes(0x23, 101, (zipped.length >>> 16) & 0xff, (zipped.length >>> 8) & 0xff, zipped.length & 0xff, ...zipped));
    expect(push).toEqual({ type: "push", command: 101, body: bytes(1, 2, 3) });
  });

  it("encodes subscription symbols and enum values", () => {
    expect([...encodeSubscribeRequest(["A.US"], [1, 4], true)]).toEqual([
      ...str(1, "A.US"),
      ...num(2, 1),
      ...num(2, 4),
      ...num(3, 1),
    ]);
  });

  it("decodes quote and trade push protobuf messages", () => {
    const quote = bytes(
      ...str(1, "AAPL.US"),
      ...num(2, 2),
      ...str(3, "210.5"),
      ...num(7, 100),
      ...num(8, 50),
      ...str(9, "1000"),
      ...num(11, 1),
      ...num(12, 5),
      ...str(13, "1052.5"),
    );
    expect(decodePushQuote(quote)).toMatchObject({
      symbol: "AAPL.US",
      lastDone: 210.5,
      timestamp: 100,
      tradeSession: 1,
      currentVolume: 5,
    });

    const trade = bytes(...str(1, "210.6"), ...num(2, 3), ...num(3, 101), ...num(6, 1));
    const push = bytes(...str(1, "AAPL.US"), ...num(2, 3), 0x1a, trade.length, ...trade);
    expect(decodePushTrades(push)).toEqual({
      symbol: "AAPL.US",
      sequence: 3,
      trades: [{ price: 210.6, volume: 3, timestamp: 101, tradeSession: 1 }],
    });
  });
});

