import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LeaderboardReport } from '../src/leaderboard/LeaderboardReport';
import { makeLeaderboardViewData } from './fixtures';

describe('LeaderboardReport', () => {
  afterEach(() => cleanup());

  it('renders the title and initial selection', () => {
    render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    expect(screen.getByRole('heading', { name: '模型交易判断力总榜' })).toBeDefined();
    expect(screen.getByText('openai/gpt-5 · 10 cells · avg 3.0 tool-calls')).toBeDefined();
  });

  it('renders one scatter dot per real model', () => {
    const { container } = render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    expect(container.querySelectorAll('circle.dot').length).toBe(2);
  });

  it('renders gauge fill widths from the fill ratio', () => {
    const { container } = render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    const row = container.querySelector('tr[data-model="openai/gpt-5"]')!;
    const bar = row.querySelector('.bartrack i') as HTMLElement;
    expect(bar.style.width).toBe('80%');
  });

  it('swaps the detail card and dot selection class when a table row is clicked', () => {
    const { container } = render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    expect(screen.getByText('openai/gpt-5 · 10 cells · avg 3.0 tool-calls')).toBeDefined();

    const row = container.querySelector('tr[data-model="anthropic/claude"]')!;
    fireEvent.click(row);

    expect(screen.getByText('anthropic/claude · 10 cells · avg 2.0 tool-calls')).toBeDefined();
    expect(container.querySelector('circle[data-model="anthropic/claude"]')?.classList.contains('sel')).toBe(
      true,
    );
    expect(container.querySelector('circle[data-model="openai/gpt-5"]')?.classList.contains('sel')).toBe(
      false,
    );
  });

  it('swaps selection when a scatter dot is clicked', () => {
    const { container } = render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    const dot = container.querySelector('circle[data-model="anthropic/claude"]')!;
    fireEvent.click(dot);

    expect(container.querySelector('tr[data-model="anthropic/claude"]')?.classList.contains('sel')).toBe(
      true,
    );
    expect(screen.getByText('anthropic/claude · 10 cells · avg 2.0 tool-calls')).toBeDefined();
  });

  it('renders beaten label in subtitle when beatenLabel is present', () => {
    const { container } = render(<LeaderboardReport data={makeLeaderboardViewData()} />);
    const subtitle = container.querySelector('.sub');
    const beatenBold = subtitle?.querySelector('b');

    expect(beatenBold).toBeDefined();
    expect(beatenBold?.textContent).toBe('2/2');
    expect(subtitle?.textContent).toContain('2/2');
    expect(subtitle?.textContent).toContain('判断分跑赢买入持有');
  });

  it('does not render beaten label when beatenLabel is null', () => {
    const data = makeLeaderboardViewData();
    data.subtitle.beatenLabel = null;
    const { container } = render(<LeaderboardReport data={data} />);
    const subtitle = container.querySelector('.sub');
    const beatenBold = subtitle?.querySelector('b');

    expect(beatenBold).toBeNull();
    expect(subtitle?.textContent).not.toContain('判断分跑赢买入持有');
  });
});
