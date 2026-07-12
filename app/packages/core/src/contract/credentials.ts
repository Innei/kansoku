import { defineRoutes } from "./defineRoutes.js";

export interface CredentialsStatus {
  configured: boolean;
  method: string | null;
  lastError: string | null;
  state: "ready" | "cli_missing" | "login_required" | "token_unreadable";
  cliPath: string | null;
}

export interface CredentialsApi {
  status(): Promise<CredentialsStatus>;
}

export const credentialsRoutes = defineRoutes<CredentialsApi>("credentials", {
  status: { method: "GET", path: "/status" },
});
