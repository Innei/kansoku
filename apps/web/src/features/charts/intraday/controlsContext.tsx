import { createContext, use, type ReactNode } from 'react';
import { useIndicatorToggles } from './useIndicatorToggles';
import { useMaLines, type MaLinesApi } from './useMaLines';
import { useVisibleTimeframes, type TimeframesApi } from './timeframes';

type IntradayControls = ReturnType<typeof useIndicatorToggles> & MaLinesApi & TimeframesApi;

const ControlsContext = createContext<IntradayControls | null>(null);

export function IntradayControlsProvider({ children }: { children: ReactNode }) {
  const indicators = useIndicatorToggles();
  const ma = useMaLines();
  const timeframes = useVisibleTimeframes();
  return (
    <ControlsContext value={{ ...indicators, ...ma, ...timeframes }}>{children}</ControlsContext>
  );
}

export function useIntradayControls(): IntradayControls {
  const controls = use(ControlsContext);
  if (!controls) {
    throw new Error('useIntradayControls 必须在 IntradayControlsProvider 内使用');
  }
  return controls;
}
