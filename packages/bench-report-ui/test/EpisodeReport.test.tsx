import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EpisodeReport } from '../src/episode/EpisodeReport';

describe('EpisodeReport', () => {
  it('renders a header from the given data', () => {
    render(<EpisodeReport data={{ title: 'Episode 42', generatedAt: '2026-07-21' }} />);
    expect(screen.getByRole('heading', { name: 'Episode 42' })).toBeDefined();
    expect(screen.getByText('2026-07-21')).toBeDefined();
  });
});
