import type {
  IChartApiBase,
  ISeriesPrimitive,
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
  Time,
} from "lightweight-charts";
import type { OffSessionBar } from "../../../../shared/types";

type DrawTarget = Parameters<ISeriesPrimitivePaneRenderer["draw"]>[0];

const colorFor = (kind: OffSessionBar["kind"]): string =>
  kind === "overnight" ? "rgba(10,10,10,0.5)" : "rgba(232,232,232,0.04)";

interface BandPx {
  x: number;
  w: number;
  color: string;
}

class SessionRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(private readonly bands: BandPx[]) {}

  draw(target: DrawTarget): void {
    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const h = scope.mediaSize.height;
      ctx.save();
      for (const b of this.bands) {
        if (b.w <= 0) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, 0, b.w, h);
      }
      ctx.restore();
    });
  }
}

class SessionPaneView implements ISeriesPrimitivePaneView {
  private bands: BandPx[] = [];

  constructor(private readonly source: SessionBgPrimitive) {}

  update(): void {
    const { chart, bars } = this.source.state();
    this.bands = [];
    if (!chart || bars.length === 0) return;
    const ts = chart.timeScale();
    const half = ts.options().barSpacing / 2;
    for (const bar of bars) {
      const cx = ts.timeToCoordinate(bar.time as Time);
      if (cx === null) continue;
      const x = Math.round(cx - half);
      const right = Math.round(cx + half);
      this.bands.push({ x, w: right - x, color: colorFor(bar.kind) });
    }
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new SessionRenderer(this.bands);
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return "bottom";
  }
}

export class SessionBgPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApiBase<Time> | null = null;
  private requestUpdate?: () => void;
  private bars: OffSessionBar[] = [];
  private readonly paneView = new SessionPaneView(this);

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart;
    this.requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.requestUpdate = undefined;
  }

  setData(bars: OffSessionBar[]): void {
    this.bars = bars;
    this.requestUpdate?.();
  }

  updateAllViews(): void {
    this.paneView.update();
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this.paneView];
  }

  state(): { chart: IChartApiBase<Time> | null; bars: OffSessionBar[] } {
    return { chart: this.chart, bars: this.bars };
  }
}
