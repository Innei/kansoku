import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeaderboardReport } from '../src/leaderboard/LeaderboardReport';

describe('LeaderboardReport', () => {
  it('renders a header from the given data', () => {
    render(<LeaderboardReport data={{ title: 'Leaderboard', generatedAt: '2026-07-21' }} />);
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeDefined();
    expect(screen.getByText('2026-07-21')).toBeDefined();
  });
});
