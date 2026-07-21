import { Fragment } from 'react';
import type { LeaderboardDetailCardView } from '../types';

export function DetailCard({ detail }: { detail: LeaderboardDetailCardView | undefined }) {
  if (!detail) return <div className="detailcard" />;
  return (
    <div className="detailcard">
      <div className="detail" data-model-detail={detail.id}>
        <h4>
          {detail.name} <span className="mvend">{detail.vendor}</span>
        </h4>
        <div className="did">{detail.did}</div>
        <div className="detailgrid">
          {detail.sections.map((section) => (
            <Fragment key={section.title}>
              <div className="dsec">{section.title}</div>
              {section.rows.map((row) => (
                <div className="drow" key={row.label}>
                  <span className="k">{row.label}</span>
                  <span className={`v${row.tone ? ` ${row.tone}` : ''}`}>{row.value}</span>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
