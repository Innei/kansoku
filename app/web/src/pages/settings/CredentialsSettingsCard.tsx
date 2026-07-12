import { useQuery } from "../../apiHooks";
import { client } from "../../client";
import { Badge, Button, Card, SectionTitle } from "../../ui";
import { getDesktopCredentialsBridge, type CredentialsGetResult } from "./desktopCredentials";

const INSTALL_URL = "https://open.longbridge.com/docs/cli/install";

export function CredentialsSettingsCard() {
  const bridge = getDesktopCredentialsBridge();
  const { data, reload } = useQuery<CredentialsGetResult>(
    bridge ? "credentials.status" : null,
    () => client.credentials.status() as Promise<CredentialsGetResult>,
  );
  if (!bridge) return null;

  const ready = data?.state === "ready";
  const label = ready
    ? "CLI 已连接"
    : data?.state === "cli_missing"
      ? "未安装 CLI"
      : data?.state === "login_required"
        ? "需要登录"
        : "Token 无法读取";

  return (
    <Card className="settings-longbridge-card">
      <SectionTitle>Longbridge CLI</SectionTitle>
      <div className="settings-cred-row">
        <span className="settings-cred-name">连接状态</span>
        <Badge tone={ready ? "up" : "down"}>{label}</Badge>
      </div>
      {data?.cliPath && <div className="settings-provider-meta">{data.cliPath}</div>}
      {data?.lastError && <div className="settings-test-result settings-test-result--fail">{data.lastError}</div>}
      <div className="settings-cred-actions">
        <Button onClick={() => window.open(INSTALL_URL, "_blank", "noopener,noreferrer")}>安装说明</Button>
        <Button accent onClick={reload}>重新检测</Button>
      </div>
    </Card>
  );
}
