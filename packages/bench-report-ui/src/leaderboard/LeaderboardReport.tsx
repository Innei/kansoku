import type { LeaderboardReportViewData } from '../types';
import * as styles from './LeaderboardReport.css';

export function LeaderboardReport({ data }: { data: LeaderboardReportViewData }) {
  return (
    <div className={styles.root}>
      <h1 className={styles.header}>{data.title}</h1>
      <p>{data.generatedAt}</p>
    </div>
  );
}
