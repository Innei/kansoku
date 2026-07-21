export function TopBar({ runId }: { runId: string }) {
  return (
    <div className="top">
      <div className="inner">
        <div className="brand">
          Kansoku <span>/ Trading Benchmark</span>
        </div>
        <nav className="nav">
          <a href="#" className="on">
            总榜
          </a>
          <a href="#" title="即将上线">
            分层
          </a>
          <a href="#" title="即将上线">
            题目难度
          </a>
          <a href="#" title="即将上线">
            同质化
          </a>
          <a href="#" title="即将上线">
            评分口径
          </a>
        </nav>
        <div className="r">
          <span>
            run <kbd>{runId}</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
