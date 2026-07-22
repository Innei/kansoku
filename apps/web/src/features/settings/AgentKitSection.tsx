import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Switch } from '@web/ui';
import { getDesktopAgentKitBridge, type AgentKitStatus } from './desktopAgentKit';

export function AgentKitSection() {
  const [bridge] = useState(() => getDesktopAgentKitBridge());
  const [status, setStatus] = useState<AgentKitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!bridge) return;
    try {
      const next = await bridge.getStatus();
      setStatus(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [bridge]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!bridge) return null;

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await bridge.setEnabled({ enabled });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const run = async (action: 'forceSync' | 'clean') => {
    if (action === 'clean' && !window.confirm('确定要清理 Agent Kit 吗？这会删除本地生成的引导文件与 kansoku-cli 入口。')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === 'forceSync') await bridge.forceSync();
      else await bridge.clean();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const conflictCount = status?.pendingConflicts?.length ?? 0;
  const updateCount = status?.pendingUpdates?.length ?? 0;

  return (
    <section className="settings-conn-section settings-conn-longbridge">
      <div className="settings-conn-title">
        <span>Agent Kit</span>
        {status ? (
          <Badge tone={status.enabled ? 'accent' : undefined}>
            {status.enabled ? '已启用' : '已停用'}
          </Badge>
        ) : null}
      </div>

      <div className="note-block">
        为外部 Claude Code / Codex 打开数据目录时提供 skill 引导 + kansoku-cli 入口
      </div>

      <div className="settings-cred-actions">
        <Switch
          ariaLabel="启用 Agent Kit"
          checked={status?.enabled ?? false}
          disabled={busy || !status}
          onCheckedChange={(checked) => void toggle(checked)}
        />
      </div>

      {status ? (
        <div className="settings-provider-meta">
          当前 Kit 版本：{status.kitVersion ?? '—'} · 上次同步：{status.lastSyncAt ?? '—'}
        </div>
      ) : (
        <div className="note-block">加载中…</div>
      )}

      {conflictCount > 0 ? (
        <div className="settings-warning-strip">
          {conflictCount} 个文件需要处理冲突，待 T7 实现对话框
        </div>
      ) : null}

      {updateCount > 0 ? (
        <div className="settings-test-result settings-test-result--ok">
          {updateCount} 个模板有新版可用，待 T7 实现对话框
        </div>
      ) : null}

      {error ? <div className="settings-test-result settings-test-result--fail">{error}</div> : null}

      <div className="settings-cred-actions">
        <Button disabled={busy} onClick={() => void run('forceSync')}>
          重刷 Agent Kit
        </Button>
        <Button disabled={busy} onClick={() => void run('clean')}>
          清理 Agent Kit（危险）
        </Button>
      </div>
    </section>
  );
}
