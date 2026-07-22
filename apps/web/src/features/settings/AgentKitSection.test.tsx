// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentKitSection } from './AgentKitSection';

function mockDesktop(handlers: Record<string, (input?: unknown) => unknown>) {
  const invoke = vi.fn(async (channel: string, input?: unknown) => {
    const handler = handlers[channel];
    if (!handler) throw new Error(`unexpected channel ${channel}`);
    return handler(input);
  });
  (window as { desktop?: unknown }).desktop = { rpc: { invoke } };
  return invoke;
}

describe('AgentKitSection', () => {
  afterEach(() => {
    cleanup();
    delete (window as { desktop?: unknown }).desktop;
  });

  it('renders nothing outside the desktop runtime', () => {
    const { container } = render(<AgentKitSection />);
    expect(container.textContent).toBe('');
  });

  it('shows enabled status, kit version and last sync', async () => {
    mockDesktop({
      'agentKit.getStatus': () => ({
        ok: true,
        data: { enabled: true, kitVersion: '1.2.0', lastSyncAt: '2026-07-22T00:00:00.000Z' },
      }),
    });

    render(<AgentKitSection />);

    expect(await screen.findByText('已启用')).toBeTruthy();
    expect(screen.getByText(/1\.2\.0/)).toBeTruthy();
    expect(screen.getByText(/2026-07-22T00:00:00\.000Z/)).toBeTruthy();
  });

  it('shows pending conflict and update counts', async () => {
    mockDesktop({
      'agentKit.getStatus': () => ({
        ok: true,
        data: {
          enabled: true,
          pendingConflicts: [{ dest: 'a.md', templatePath: 't/a.md', reason: 'target-exists-no-state' }],
          pendingUpdates: [
            { dest: 'b.md', templatePath: 't/b.md', oldTemplateHash: 'x', newTemplateHash: 'y' },
          ],
        },
      }),
    });

    render(<AgentKitSection />);

    expect(await screen.findByText(/1 个文件需要处理冲突/)).toBeTruthy();
    expect(screen.getByText(/1 个模板有新版可用/)).toBeTruthy();
  });

  it('toggling the switch calls setEnabled then reloads status', async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: { enabled: false } })
      .mockResolvedValueOnce({ ok: true, data: { enabled: true } });
    const setEnabled = vi.fn((_input?: unknown) => ({
      ok: true,
      data: { enabled: true, conflicts: [], updates: [] },
    }));
    mockDesktop({
      'agentKit.getStatus': () => getStatus(),
      'agentKit.setEnabled': (input) => setEnabled(input),
    });

    render(<AgentKitSection />);

    const toggle = await screen.findByRole('switch');
    fireEvent.click(toggle);

    await screen.findByText('已启用');
    expect(setEnabled).toHaveBeenCalledWith({ enabled: true });
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('重刷 calls forceSync then reloads status', async () => {
    const forceSync = vi.fn(() => ({ ok: true, data: { conflicts: [], updates: [] } }));
    const getStatus = vi.fn(() => ({ ok: true, data: { enabled: true } }));
    mockDesktop({
      'agentKit.getStatus': () => getStatus(),
      'agentKit.forceSync': () => forceSync(),
    });

    render(<AgentKitSection />);

    const button = await screen.findByRole('button', { name: '重刷 Agent Kit' });
    fireEvent.click(button);

    await vi.waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2));
    expect(forceSync).toHaveBeenCalledTimes(1);
  });

  it('清理 asks for confirmation before calling clean', async () => {
    const clean = vi.fn(() => ({ ok: true, data: { cleaned: true } }));
    const getStatus = vi.fn(() => ({ ok: true, data: { enabled: true } }));
    mockDesktop({
      'agentKit.getStatus': () => getStatus(),
      'agentKit.clean': () => clean(),
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AgentKitSection />);

    const button = await screen.findByRole('button', { name: '清理 Agent Kit（危险）' });
    fireEvent.click(button);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(clean).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(button);

    await vi.waitFor(() => expect(clean).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });
});
