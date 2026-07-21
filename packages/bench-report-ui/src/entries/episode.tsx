import { createRoot } from 'react-dom/client';
import { EpisodeReport } from '../episode/EpisodeReport';
import type { EpisodeReportViewData } from '../types';

const data = window.__KANSOKU_REPORT_DATA__ as EpisodeReportViewData;
const container = document.getElementById('root');
if (!container) {
  throw new Error('missing #root container for episode report');
}
createRoot(container).render(<EpisodeReport data={data} />);
