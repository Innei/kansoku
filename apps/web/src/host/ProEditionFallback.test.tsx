// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProEditionFallback } from './ProEditionFallback';

vi.mock('../pages/Home', () => ({ Home: () => <div data-testid="home" /> }));

afterEach(() => {
  cleanup();
});

describe('ProEditionFallback', () => {
  it('renders Home immediately while the edition bootstrap is in flight', () => {
    const bootstrap = vi.fn(() => new Promise<null>(() => {}));

    render(<ProEditionFallback deps={{ bootstrap }} />);

    expect(screen.getByTestId('home')).toBeTruthy();
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('keeps showing Home when bootstrap resolves null (community build / locked / no matching edition)', async () => {
    const bootstrap = vi.fn(async () => null);

    render(<ProEditionFallback deps={{ bootstrap }} />);

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('home')).toBeTruthy();
  });

  it('hides Home once bootstrap resolves a mount cleanup (edition mounted into the container)', async () => {
    const dispose = vi.fn();
    const bootstrap = vi.fn(async () => dispose);

    render(<ProEditionFallback deps={{ bootstrap }} />);

    await waitFor(() => expect(screen.queryByTestId('home')).toBeNull());
  });

  it('calls the mount cleanup on unmount', async () => {
    const dispose = vi.fn();
    const bootstrap = vi.fn(async () => dispose);

    const { unmount } = render(<ProEditionFallback deps={{ bootstrap }} />);

    await waitFor(() => expect(screen.queryByTestId('home')).toBeNull());
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('does not call the resolved cleanup twice, and disposes a late-resolving mount if unmounted first', async () => {
    const dispose = vi.fn();
    let resolveBootstrap: ((value: (() => void) | null) => void) | undefined;
    const bootstrap = vi.fn(
      () =>
        new Promise<(() => void) | null>((resolve) => {
          resolveBootstrap = resolve;
        }),
    );

    const { unmount } = render(<ProEditionFallback deps={{ bootstrap }} />);
    unmount();
    resolveBootstrap?.(dispose);

    await vi.waitFor(() => expect(dispose).toHaveBeenCalledTimes(1));
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('falls back to Home when the bootstrap promise rejects instead of resolving', async () => {
    const bootstrap = vi.fn(async () => {
      throw new Error('pro-asset unavailable');
    });
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

    render(<ProEditionFallback deps={{ bootstrap }} />);

    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy());
    consoleInfo.mockRestore();
  });
});
