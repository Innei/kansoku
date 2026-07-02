import { ClientError } from "../errors.js";
import { buildChart, refreshBody } from "../services/build.js";
import { loadChart } from "../services/store.js";
import { createPoller, type PollerHandle } from "./poller.js";

const CHART_INTERVAL_MS = 60_000;
const LIVE_TYPES = new Set(["flow", "kline", "intraday"]);

const chartPollers = new Map<string, PollerHandle>();

export async function subscribeChart(id: string, push: (envelope: string) => void): Promise<() => void> {
  const doc = await loadChart(id);
  if (!doc) throw new ClientError(`chart not found: ${id}`, undefined, 404);

  push(JSON.stringify({ type: "data", data: { built: doc.built } }));

  if (!LIVE_TYPES.has(doc.type) || !refreshBody(doc.type, doc.input)) return () => {};

  let handle = chartPollers.get(id);
  if (!handle) {
    handle = createPoller({
      intervalMs: CHART_INTERVAL_MS,
      task: async () => {
        const latest = await loadChart(id);
        if (!latest) throw new ClientError(`chart not found: ${id}`, undefined, 404);
        const body = refreshBody(latest.type, latest.input);
        if (!body) return { built: latest.built };
        const result = await buildChart(body);
        return { built: result.built };
      },
      onStop: () => {
        chartPollers.delete(id);
      },
    });
    chartPollers.set(id, handle);
  }
  return handle.subscribe(push);
}
