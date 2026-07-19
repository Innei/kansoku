import { useEffect } from 'react';
import type { ChartDoc } from '@kansoku/shared/types';
import { chartTargetPath } from '@kansoku/shared/chartUrl';
import { useQuery } from './apiHooks';
import { client } from './client';
import { configureRoutes } from './edition';
import { symbolFromRoute } from './lib/symbol';
import { Home } from './pages/Home';
import { PopoutChartWindow } from './pages/PopoutChartWindow';
import { SymbolCockpit } from './pages/SymbolCockpit';
import { matchPopoutSymbolRoute, navigate, routePathname, useRoute } from './router';
import { RouteRegistry } from './routing/RouteRegistry';
import { ErrorBox } from './ui';

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function ChartRedirect({ id }: { id: string }) {
  const { data, failure } = useQuery<ChartDoc>(
    `charts.get:${id}`,
    () => client.charts.get({ id }),
    {
      persist: false,
    },
  );

  useEffect(() => {
    if (data) navigate(chartTargetPath(data), { replace: true });
    else if (failure && failure.status === 404)
      navigate('/?notice=chart-not-found', { replace: true });
  }, [data, failure]);

  if (failure && failure.status !== 404) {
    return (
      <div className="page">
        <ErrorBox>{failure.message}</ErrorBox>
      </div>
    );
  }

  return null;
}

export function Router() {
  const route = useRoute();
  const pathname = routePathname(route);

  if (pathname === '/overview' || pathname === '/charts') {
    return <Redirect to="/" />;
  }
  const popoutSymbol = matchPopoutSymbolRoute(pathname);
  if (popoutSymbol) return <PopoutChartWindow sym={popoutSymbol} />;
  const chartMatch = pathname.match(/^\/charts\/(.+)$/);
  if (chartMatch) {
    return <ChartRedirect id={decodeURIComponent(chartMatch[1])} />;
  }
  const symbol = symbolFromRoute(route);
  if (symbol) return <SymbolCockpit sym={symbol} />;

  const registry = new RouteRegistry();
  configureRoutes(registry);
  const Page = registry.get(pathname);
  if (Page) return <Page />;
  return <Home />;
}
