// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IntradayBuilt } from '@kansoku/shared/types';

vi.mock('@web/features/edition/capabilitiesStore', () => ({
  useCapabilities: () => ({ features: { 'auto-patterns': 'active', 'options-walls': 'active' } }),
}));

vi.mock('./useIntradayCharts', () => ({
  EMA_COLORS: ['#fff'],
  useIntradayCharts: vi.fn(),
}));

vi.mock('../drawings/useDrawings', () => ({
  useDrawings: () => ({}),
}));

vi.mock('../drawings/DrawingToolbar', () => ({
  DrawingToolbar: () => null,
}));

const { IntradayChartOnly } = await import('./IntradayDashboard');
const { IntradayControlsProvider } = await import('./controlsContext');

const built = {
  sidebar: { technicals: { m5: { emas: [{ period: 9, last: 588.39 }] } } },
  timeframes: { m5: { candles: [] } },
} as unknown as IntradayBuilt;

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('IntradayChartOnly', () => {
  it('renders the EMA legend from the built technicals', () => {
    const { container } = render(
      <IntradayControlsProvider>
        <IntradayChartOnly symbol="NVDA.US" built={built} activeTf="m5" />
      </IntradayControlsProvider>,
    );

    expect(container.querySelector('.chart-legend')?.textContent).toContain('EMA9');
  });

  it('no longer floats the layer panel over the chart — it moved to the control bar', () => {
    const { container } = render(
      <IntradayControlsProvider>
        <IntradayChartOnly symbol="NVDA.US" built={built} activeTf="m5" />
      </IntradayControlsProvider>,
    );

    expect(container.querySelector('.layer-panel')).toBeNull();
  });
});
