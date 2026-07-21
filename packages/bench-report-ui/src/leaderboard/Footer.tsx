import type { LeaderboardReportViewData } from '../types';

export function Footer({ data }: { data: LeaderboardReportViewData }) {
  return (
    <div className="foot">
      <span>
        Kansoku Trading Benchmark · <span className="mono">{data.footer.datasetVersion}</span> · run{' '}
        <span className="mono">{data.footer.runId}</span>
      </span>
      <span>
        generated <span className="mono">{data.footer.generatedAt}</span>
      </span>
    </div>
  );
}
