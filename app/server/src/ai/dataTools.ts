import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { NewsItem, RawBar } from "../../../shared/types.js";
import type { ReassessPack } from "./datapack.js";

const KLINE_MAX_COUNT = 500;
const KLINE_DEFAULT_COUNT = 200;

const KLINE_PERIODS: Record<string, string> = { m5: "5m", m15: "15m", h1: "1h", day: "day" };

const klineSchema = Type.Object({
  period: Type.Union([Type.Literal("m5"), Type.Literal("m15"), Type.Literal("h1"), Type.Literal("day")]),
  count: Type.Optional(Type.Number()),
});

export function textResult(text: string, terminate = false): AgentToolResult<Record<string, never>> {
  return { content: [{ type: "text" as const, text }], details: {}, terminate };
}

function clampCount(count: number | undefined): number {
  if (count == null || !Number.isFinite(count)) return KLINE_DEFAULT_COUNT;
  return Math.max(1, Math.min(KLINE_MAX_COUNT, Math.floor(count)));
}

export function buildDataPackTool(
  symbol: string,
  opts: { buildPack: (symbol: string) => Promise<ReassessPack>; onPack?: (pack: ReassessPack) => void },
): AgentTool {
  let cachedPack: ReassessPack | null = null;

  return {
    name: "read_data_pack",
    label: "Read Data Pack",
    description: "拉取该标的的多周期快照：K 线摘要、资金流、相对成交量、日内关键价位、大盘参照 SPY/QQQ、新闻、已归档预测、持仓。",
    parameters: Type.Object({}),
    execute: async () => {
      if (!cachedPack) {
        cachedPack = await opts.buildPack(symbol);
        opts.onPack?.(cachedPack);
      }
      return textResult(JSON.stringify(cachedPack));
    },
  };
}

export function buildKlineTool(
  symbol: string,
  fetchKline: (symbol: string, period: string, count: number) => Promise<RawBar[]>,
): AgentTool<typeof klineSchema> {
  return {
    name: "fetch_kline",
    label: "Fetch K-line",
    description: "补拉某个周期的 K 线。period 限 m5/m15/h1/day，count 上限 500。",
    parameters: klineSchema,
    execute: async (_id, params) => {
      const period = KLINE_PERIODS[params.period];
      const count = clampCount(params.count);
      const bars = await fetchKline(symbol, period, count);
      return textResult(JSON.stringify({ period: params.period, count, bars }));
    },
  };
}

export function buildNewsTool(symbol: string, fetchNews: (symbol: string) => Promise<NewsItem[]>): AgentTool {
  return {
    name: "fetch_news",
    label: "Fetch News",
    description: "拉取该标的最近的新闻与催化消息。",
    parameters: Type.Object({}),
    execute: async () => textResult(JSON.stringify(await fetchNews(symbol))),
  };
}
