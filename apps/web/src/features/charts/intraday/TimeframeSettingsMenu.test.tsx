// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimeframeSettingsMenu } from './TimeframeSettingsMenu';
import { IntradayControlsProvider } from './controlsContext';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function open() {
  render(
    <IntradayControlsProvider>
      <TimeframeSettingsMenu />
    </IntradayControlsProvider>,
  );
  fireEvent.click(screen.getByLabelText('周期设置'));
}

describe('TimeframeSettingsMenu', () => {
  it('adds a view period and writes it to storage', () => {
    open();

    fireEvent.click(screen.getByText('30 分钟'));

    expect(JSON.parse(localStorage.getItem('intraday-timeframes')!)).toEqual([
      'm5',
      'm15',
      '30m',
      'h1',
    ]);
  });

  it('refuses to untick an analysis timeframe', () => {
    open();

    fireEvent.click(screen.getByText('5 分钟'));

    const stored = localStorage.getItem('intraday-timeframes');
    expect(stored === null || JSON.parse(stored).includes('m5')).toBe(true);
  });
});
