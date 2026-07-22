// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSkeleton } from './AppSkeleton';

describe('AppSkeleton', () => {
  it('renders its page directly outside the home scroll-area layout', () => {
    const { container } = render(<AppSkeleton />);
    const page = container.querySelector('.app-skeleton > .app-skeleton-page');

    expect(page).toBeTruthy();
    expect(container.querySelector('.home-page')).toBeNull();
    expect(container.querySelector('.scroll-area')).toBeNull();
    expect(page?.querySelector('.home-top-strip')).toBeTruthy();
    expect(page?.querySelector('.date-timeline')).toBeTruthy();
    expect(page?.querySelector('.home-grid')).toBeTruthy();
    expect(page?.querySelector('.market-panorama')).toBeTruthy();
    expect(page?.querySelector('.home-side-content > .positions-card')).toBeTruthy();
    expect(page?.querySelector('.home-side-content > .event-calendar')).toBeTruthy();
  });
});
