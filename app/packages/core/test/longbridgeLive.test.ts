import { expect, it } from "vitest";
import { LongbridgeQuoteSocket } from "../src/services/marketdata/longbridgeSocket.js";

it.runIf(process.env.LONGBRIDGE_LIVE === "1")(
  "authenticates and subscribes through the real Longbridge quote gateway",
  async () => {
    const socket = new LongbridgeQuoteSocket();
    await expect(socket.subscribe(["AAPL.US"], [1])).resolves.toBeUndefined();
    socket.close();
  },
  15_000,
);

