// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getLocalWatchlist = vi.fn();
const putLocalWatchlist = vi.fn();

vi.mock('@web/lib/client', () => ({
  client: {
    settings: {
      getLocalWatchlist: (...args: unknown[]) => getLocalWatchlist(...args),
      putLocalWatchlist: (...args: unknown[]) => putLocalWatchlist(...args),
    },
  },
}));

const { LocalWatchlistCard } = await import('./LocalWatchlistCard');

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('LocalWatchlistCard', () => {
  afterEach(() => {
    cleanup();
    getLocalWatchlist.mockReset();
    putLocalWatchlist.mockReset();
  });

  it('renders the fetched symbols', async () => {
    getLocalWatchlist.mockResolvedValue({ symbols: ['MU.US', 'NVDA.US'] });

    renderWithClient(<LocalWatchlistCard />);

    expect(await screen.findByText('MU.US')).toBeTruthy();
    expect(screen.getByText('NVDA.US')).toBeTruthy();
  });

  it('adding a symbol canonicalizes it to the server form before saving', async () => {
    getLocalWatchlist.mockResolvedValue({ symbols: ['MU.US'] });
    putLocalWatchlist.mockResolvedValue({ symbols: ['MU.US', 'TSM.US'] });

    renderWithClient(<LocalWatchlistCard />);
    await screen.findByText('MU.US');

    fireEvent.change(screen.getByPlaceholderText('输入代码，如 MU'), {
      target: { value: 'tsm' },
    });
    fireEvent.click(screen.getByText('添加'));

    expect(await screen.findByText('TSM.US')).toBeTruthy();
    expect(putLocalWatchlist).toHaveBeenCalledWith({ symbols: ['MU.US', 'TSM.US'] });
  });

  it('removing a symbol saves the updated list', async () => {
    getLocalWatchlist.mockResolvedValue({ symbols: ['MU.US', 'NVDA.US'] });
    putLocalWatchlist.mockResolvedValue({ symbols: ['NVDA.US'] });

    renderWithClient(<LocalWatchlistCard />);
    await screen.findByText('MU.US');

    fireEvent.click(screen.getByLabelText('移除 MU.US'));

    expect(screen.queryByText('MU.US')).toBeNull();
    expect(putLocalWatchlist).toHaveBeenCalledWith({ symbols: ['NVDA.US'] });
  });
});
