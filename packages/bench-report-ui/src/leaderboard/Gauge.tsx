import type { LeaderboardGauge } from '../types';

export function Gauge({ gauge }: { gauge: LeaderboardGauge }) {
  return (
    <span className="bar">
      <span className={`bartrack ${gauge.kind}`}>
        <i style={{ width: `${(gauge.fillRatio * 100).toFixed(0)}%` }} />
      </span>
      <span className="num">{gauge.text}</span>
    </span>
  );
}
