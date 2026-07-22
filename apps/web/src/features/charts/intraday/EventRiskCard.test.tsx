// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { IntradayEventRisk } from '@kansoku/shared/types';
import { setTimeDisplayPreference } from '@web/lib/timeDisplayPreference';
import { EventRiskCard } from './EventRiskCard';

afterEach(() => {
  cleanup();
  setTimeDisplayPreference('market');
});

describe('EventRiskCard', () => {
  it('groups events by day and keeps each event time on its own compact row', () => {
    const eventRisk: IntradayEventRisk = {
      macro: [
        {
          ts: '2026-07-22T14:30:00Z',
          title: '美国, EIA 每周原油库存',
          estimate: '-1.052',
          previous: null,
        },
        {
          ts: '2026-07-22T18:00:00Z',
          title: '美国, 成屋销售',
          estimate: null,
          previous: '4.01m',
        },
        {
          ts: '2026-07-23T12:30:00Z',
          title: '美国, 初请失业金人数',
          estimate: '212',
          previous: null,
        },
      ],
      next_earnings: {
        date: '2026-07-23',
        title: '盘后公布',
      },
      updated_at: '2026-07-22T12:00:00Z',
    };

    const { container } = render(<EventRiskCard eventRisk={eventRisk} />);

    expect(screen.getAllByText('07-22')).toHaveLength(1);
    expect(screen.getAllByText('07-23')).toHaveLength(1);
    expect(container.querySelectorAll('.event-card-group')).toHaveLength(2);
    expect(screen.getByText('10:30').closest('.event-card-time')).toBeTruthy();
    expect(screen.queryByText('07-22 10:30')).toBeNull();
    expect(screen.getByText('财报')).toBeTruthy();
    expect(screen.getByText('盘后公布')).toBeTruthy();
  });
});
