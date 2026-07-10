import { Config, QuoteContext } from "longbridge";
import type { LongbridgeCredentials } from "../../server/src/services/credentials/types.js";
import type { TestCredentialsResult } from "./credentialsBridge.js";

const TEST_SYMBOL = "AAPL.US";

export async function testLongbridgeCredentials(creds: LongbridgeCredentials): Promise<TestCredentialsResult> {
  try {
    const config = Config.fromApikey(creds.appKey, creds.appSecret, creds.accessToken);
    const ctx = await QuoteContext.new(config);
    await ctx.quote([TEST_SYMBOL]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "credential test failed" };
  }
}
