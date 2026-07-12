import { useEffect } from "react";
import { useQuery } from "../apiHooks";
import { client } from "../client";
import { getDesktopCredentialsBridge, type CredentialsGetResult } from "../pages/settings/desktopCredentials";
import { clearRestricted } from "../restrictedMode";
import { computeGateStatus, type GateStatus } from "./gateStatus";

export function useCredentialsGate(): {
  status: GateStatus;
  bridge: ReturnType<typeof getDesktopCredentialsBridge>;
  details: CredentialsGetResult | null;
  recheck: () => void;
} {
  const bridge = getDesktopCredentialsBridge();
  const { data, loading, reload } = useQuery<CredentialsGetResult>(
    bridge ? "credentials.status" : null,
    () => client.credentials.status() as Promise<CredentialsGetResult>,
  );

  useEffect(() => {
    if (data?.configured) clearRestricted();
  }, [data?.configured]);

  const status = computeGateStatus({
    hasDesktopBridge: bridge !== null,
    statusLoading: loading,
    configured: data ? data.configured : null,
  });

  return { status, bridge, details: data ?? null, recheck: reload };
}
