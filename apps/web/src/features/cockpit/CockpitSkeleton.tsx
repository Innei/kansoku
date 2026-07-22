import { ArrowLeft } from 'lucide-react';

function Bone({ className }: { className: string }) {
  return <div className={`app-skeleton-bone ${className}`} />;
}

export function CockpitSkeleton() {
  return (
    <div className="fullpage cockpit-skeleton" aria-busy="true" aria-label="加载中">
      <div className="detail-topbar detail-topbar--split">
        <div className="topbar-chart">
          <a href="/">
            <ArrowLeft className="icon" size={13} /> 列表
          </a>
          <Bone className="cockpit-skeleton-bone--meta" />
          <span className="topbar-chart-ctrls" aria-hidden="true">
            <Bone className="cockpit-skeleton-bone--tf" />
            <Bone className="cockpit-skeleton-bone--tf" />
            <Bone className="cockpit-skeleton-bone--tf" />
          </span>
        </div>
        <div className="topbar-side" aria-hidden="true">
          <Bone className="cockpit-skeleton-bone--quote" />
        </div>
      </div>
      <div className="detail-body">
        <div className="layout" aria-hidden="true">
          <div className="charts-col">
            <div className="chart-block cockpit-skeleton-main">
              <Bone className="cockpit-skeleton-bone--chart" />
            </div>
            <div className="chart-block cockpit-skeleton-macd">
              <Bone className="cockpit-skeleton-bone--chart" />
            </div>
          </div>
          <div className="sidebar">
            <div className="cockpit-skeleton-tabbar">
              <Bone className="cockpit-skeleton-bone--tab" />
              <Bone className="cockpit-skeleton-bone--tab" />
              <Bone className="cockpit-skeleton-bone--tab" />
              <Bone className="cockpit-skeleton-bone--tab" />
            </div>
            <div className="sidebar-scroll">
              <Bone className="cockpit-skeleton-bone--line cockpit-skeleton-bone--w60" />
              <Bone className="cockpit-skeleton-bone--block" />
              <Bone className="cockpit-skeleton-bone--line" />
              <Bone className="cockpit-skeleton-bone--line cockpit-skeleton-bone--w80" />
              <Bone className="cockpit-skeleton-bone--line cockpit-skeleton-bone--w60" />
              <Bone className="cockpit-skeleton-bone--block" />
              <Bone className="cockpit-skeleton-bone--line cockpit-skeleton-bone--w80" />
              <Bone className="cockpit-skeleton-bone--line cockpit-skeleton-bone--w40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
