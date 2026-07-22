function isElectronShell(): boolean {
  return typeof navigator !== 'undefined' && /\bElectron\b/.test(navigator.userAgent);
}

function Bone({ className = '' }: { className?: string }) {
  return <div className={`app-skeleton-bone${className ? ` ${className}` : ''}`} />;
}

const INDEX_BONES = ['spy', 'qqq', 'dji', 'vix'];
const SHORTCUT_BONES = ['one', 'two', 'three', 'four', 'five'];
const TIMELINE_BONES = Array.from({ length: 10 }, (_, i) => i + 1);
const TAIL_BONES = Array.from({ length: 16 }, (_, i) => i + 1);
const POSITION_ROWS = Array.from({ length: 5 }, (_, i) => i + 1);
const PANORAMA_ROWS = ['row-1', 'row-2', 'row-3', 'row-4'];
const CALENDAR_DAYS = Array.from({ length: 42 }, (_, i) => i + 1);

function TopStripBone() {
  return (
    <div className="home-top-strip app-skeleton-top-strip" aria-hidden="true">
      <div className="hts-id">
        <h1>盘面</h1>
        <Bone className="app-skeleton-bone--session" />
        <Bone className="app-skeleton-bone--hts-date" />
      </div>
      <div className="hts-cluster">
        {INDEX_BONES.map((key) => (
          <Bone key={key} className="app-skeleton-bone--index" />
        ))}
      </div>
      <div className="market-temp app-skeleton-market-temp">
        <Bone className="app-skeleton-bone--temp-label" />
        <Bone className="app-skeleton-bone--temp-gauge" />
        <Bone className="app-skeleton-bone--temp-sub" />
      </div>
    </div>
  );
}

function SymbolCardBone() {
  return (
    <div className="card app-skeleton-symbol-card" aria-hidden="true">
      <div className="app-skeleton-symbol-head">
        <Bone className="app-skeleton-bone--sym" />
        <Bone className="app-skeleton-bone--badge" />
        <Bone className="app-skeleton-bone--quote" />
      </div>
      <div className="app-skeleton-symbol-levels">
        <Bone className="app-skeleton-bone--level" />
        <Bone className="app-skeleton-bone--level" />
        <Bone className="app-skeleton-bone--level" />
      </div>
    </div>
  );
}

function TimelineBone() {
  return (
    <div className="date-timeline app-skeleton-timeline" aria-hidden="true">
      <div className="dtl-track">
        {TIMELINE_BONES.map((day) => (
          <div className="dtl-item" key={day}>
            <span className="dtl-month">{day === 1 ? '7月' : '\u00A0'}</span>
            <span className="dtl-dot" />
            <Bone className="dtl-day app-skeleton-bone--timeline-day" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionsBone() {
  return (
    <div className="card positions-card app-skeleton-positions" aria-hidden="true">
      <div className="positions-summary">
        <Bone className="app-skeleton-bone--stat" />
        <Bone className="app-skeleton-bone--stat" />
        <Bone className="app-skeleton-bone--stat" />
        <Bone className="app-skeleton-bone--stat" />
      </div>
      <div className="positions-list">
        {POSITION_ROWS.map((row) => (
          <div className="positions-row" key={row}>
            <Bone className="app-skeleton-bone--position-symbol" />
            <Bone className="app-skeleton-bone--position-detail" />
            <Bone className="app-skeleton-bone--position-last" />
            <Bone className="app-skeleton-bone--position-pct" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCalendarBone() {
  return (
    <div className="event-calendar app-skeleton-event-calendar" aria-hidden="true">
      <div className="cal-nav">
        <Bone className="app-skeleton-bone--cal-button" />
        <Bone className="app-skeleton-bone--cal-title" />
        <Bone className="app-skeleton-bone--cal-button" />
      </div>
      <div className="cal-weekdays">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
          <Bone className="app-skeleton-bone--weekday" key={day} />
        ))}
      </div>
      <div className="cal-grid">
        {CALENDAR_DAYS.map((day) => (
          <div className="cal-day app-skeleton-cal-day" key={day}>
            <Bone className="app-skeleton-bone--cal-day" />
          </div>
        ))}
      </div>
      <div className="event-strip">
        <Bone className="app-skeleton-bone--event-label" />
        <Bone className="app-skeleton-bone--event-row" />
        <Bone className="app-skeleton-bone--event-row" />
      </div>
    </div>
  );
}

export function AppSkeleton() {
  const desktop = isElectronShell();

  return (
    <div
      className={`app-skeleton${desktop ? ' app-skeleton--desktop' : ''}`}
      aria-busy="true"
      aria-label="加载中"
    >
      {desktop && (
        <div className="app-skeleton-titlebar">
          <div className="app-skeleton-traffic" />
          <div className="app-skeleton-tabstrip">
            <Bone className="app-skeleton-bone--tab" />
          </div>
        </div>
      )}

      <div className="page app-skeleton-page">
        <TopStripBone />

        <div className="quickbar" aria-hidden="true">
          <Bone className="app-skeleton-bone--input" />
          {SHORTCUT_BONES.map((key) => (
            <Bone className="app-skeleton-bone--chip" key={key} />
          ))}
          <div className="quickbar-actions">
            <Bone className="app-skeleton-bone--action" />
            <Bone className="app-skeleton-bone--action" />
            <Bone className="app-skeleton-bone--action" />
          </div>
        </div>

        <TimelineBone />

        <div className="home-grid">
          <div className="home-main">
            <div className="section-title section-title--with-age">看盘</div>
            <div className="overview-grid" aria-hidden="true">
              <SymbolCardBone />
              <SymbolCardBone />
              <SymbolCardBone />
              <SymbolCardBone />
            </div>
            <div className="watch-tail" aria-hidden="true">
              {TAIL_BONES.map((cell) => (
                <Bone className="watch-tail-cell app-skeleton-tail-cell" key={cell} />
              ))}
            </div>
            <div className="section-title section-title--with-age">市场全景</div>
            <div className="market-panorama" aria-hidden="true">
              <div className="pano-tabs">
                <Bone className="app-skeleton-bone--pano-tab" />
                <Bone className="app-skeleton-bone--pano-tab" />
              </div>
              <div className="pano-rows">
                {PANORAMA_ROWS.map((row) => (
                  <div className="pano-row" key={row}>
                    <Bone className="pano-sector app-skeleton-pano-sector" />
                    <Bone className="pano-sector app-skeleton-pano-sector" />
                  </div>
                ))}
              </div>
              <div className="pano-chips app-skeleton-pano-chips">
                <Bone className="app-skeleton-bone--pano-chip" />
                <Bone className="app-skeleton-bone--pano-chip" />
                <Bone className="app-skeleton-bone--pano-chip" />
              </div>
              <Bone className="sector-read app-skeleton-sector-read" />
            </div>
          </div>
          <div className="home-side">
            <div className="home-side-content">
              <div className="section-title section-title--with-age">持仓</div>
              <PositionsBone />
              <div className="section-title">事件日历</div>
              <EventCalendarBone />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
