import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Badge, Button, openModal, Switch } from '@web/ui';
import { AgentKitConflictDialog } from './AgentKitConflictDialog';
import { AgentKitUpdateDialog } from './AgentKitUpdateDialog';
import {
  getDesktopAgentKitBridge,
  type AgentKitStatus,
  type PendingConflict,
  type PendingUpdate,
} from './desktopAgentKit';

const pendingRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

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

  const openConflict = (conflict: PendingConflict) =>
    openModal({
      title: <>处理冲突 · {conflict.dest}</>,
      body: (close) => (
        <AgentKitConflictDialog conflict={conflict} bridge={bridge} onResolved={reload} close={close} />
      ),
    });

  const openUpdate = (update: PendingUpdate) =>
    openModal({
      title: <>新模板可用 · {update.dest}</>,
      body: (close) => (
        <AgentKitUpdateDialog update={update} bridge={bridge} onResolved={reload} close={close} />
      ),
    });

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

      {status?.pendingConflicts?.map((conflict) => (
        <div key={conflict.dest} style={pendingRowStyle}>
          <span>⚠ {conflict.dest}</span>
          <Button onClick={() => openConflict(conflict)}>处理</Button>
        </div>
      ))}

      {status?.pendingUpdates?.map((update) => (
        <div key={update.dest} style={pendingRowStyle}>
          <span>ℹ {update.dest}</span>
          <Button onClick={() => openUpdate(update)}>查看</Button>
        </div>
      ))}

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
