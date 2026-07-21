export function FilterBar() {
  return (
    <div className="fbar">
      <div className="fg">
        <label>模式</label>
        <button className="pill on">全部</button>
        <button className="pill">盲盘</button>
        <button className="pill">实盘</button>
      </div>
      <div className="fg">
        <label>基线</label>
        <button className="pill on">显示</button>
        <button className="pill">隐藏</button>
      </div>
      <div className="r">
        <input className="search" placeholder="搜索模型…" disabled />
      </div>
    </div>
  );
}
