export interface EpisodeReportViewData {
  title: string;
  generatedAt: string;
}

export interface LeaderboardReportViewData {
  title: string;
  generatedAt: string;
}

declare global {
  interface Window {
    __KANSOKU_REPORT_DATA__?: EpisodeReportViewData | LeaderboardReportViewData;
  }
}
