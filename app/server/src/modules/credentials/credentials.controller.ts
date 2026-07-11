import { Controller, Get } from "@tsuki-hono/common";
import { getLastCredentialError } from "../../../../packages/core/src/services/credentials/credentialStatus.js";
import { getCredentialProvider } from "../../../../packages/core/src/services/credentials/registry.js";

@Controller("credentials")
export class CredentialsController {
  @Get("/status")
  async getStatus() {
    const auth = await getCredentialProvider().getLongbridgeAuth();
    return { ok: true, data: { configured: auth !== null, method: auth?.kind ?? null, lastError: getLastCredentialError() } };
  }
}
