import { createRoot } from 'react-dom/client';
import { LeaderboardReport } from '../leaderboard/LeaderboardReport';
import type { LeaderboardReportViewData } from '../types';

const data = window.__KANSOKU_REPORT_DATA__ as LeaderboardReportViewData;
const container = document.getElementById('root');
if (!container) {
  throw new Error('missing #root container for leaderboard report');
}
createRoot(container).render(<LeaderboardReport data={data} />);
