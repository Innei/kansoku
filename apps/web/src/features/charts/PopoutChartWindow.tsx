import { IntradayChartOnly, IntradayTimeframeSwitch } from './intraday/IntradayDashboard';
import { ChartLayerMenu } from './intraday/ChartLayerMenu';
import { MaLinesMenu } from './intraday/MaLinesMenu';
import { tfDataOf, withViewTimeframe } from './intraday/timeframes';
import { useViewTimeframe } from './intraday/useViewTimeframe';
import { IntradayControlsProvider } from './intraday/controlsContext';
import { getShellRpc } from '../desktop/shellRpc';
import { resolveIntradayTf } from './intraday/useIntradayDoc';
import { useIntradayPreview } from './intraday/useIntradayPreview';
import { TopbarQuote } from '../quotes/QuoteBar';
import { Dot, Empty, ErrorBox } from '../../ui';
import { useLiveQuote } from '../quotes/useLiveQuote';
import { useTitle } from '../../lib/useTitle';

export function PopoutChartWindow({ sym }: { sym: string }) {
  const symLabel = sym.toUpperCase().replace(/\.US$/, '');
  const liveQuote = useLiveQuote(sym);
  const { built, error, degraded, intradayTf, setIntradayTf } = useIntradayPreview(sym);
  const isDesktop = getShellRpc() !== null;
  useTitle(symLabel);
  const viewTimeframe = useViewTimeframe(sym, intradayTf ?? 'm15', { live: true, liveQuote });
  const activeTf = built ? resolveIntradayTf(built, intradayTf) : null;
  const chartBuilt =
    built && activeTf ? withViewTimeframe(built, activeTf, viewTimeframe.tf) : built;

  return (
    <IntradayControlsProvider>
      <div className="popout-shell">
        <div className="popout-header">
          {isDesktop && <div className="popout-traffic-spacer" />}
          <span className="popout-symbol">{symLabel}</span>
          {degraded && <Dot tone="accent" pulse title="数据延迟：行情拉取失败，正在重试" />}
          {activeTf && <IntradayTimeframeSwitch activeTf={activeTf} onChange={setIntradayTf} />}
          <span className="topbar-chart-tail">
            {chartBuilt && activeTf && (
              <>
                <MaLinesMenu candles={tfDataOf(chartBuilt, activeTf)?.candles ?? []} />
                <ChartLayerMenu built={chartBuilt} activeTf={activeTf} />
              </>
            )}
            <TopbarQuote quote={liveQuote} />
          </span>
        </div>
        <div className="popout-body">
          {error ? (
            <ErrorBox>{error}</ErrorBox>
          ) : !chartBuilt || !activeTf ? (
            <Empty>加载中…</Empty>
          ) : (
            <IntradayChartOnly symbol={sym} built={chartBuilt} activeTf={activeTf} />
          )}
        </div>
      </div>
    </IntradayControlsProvider>
  );
}
