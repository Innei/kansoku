import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { ChartDoc } from "../../shared/types.js";

const ctx = vi.hoisted(() => {
  const base = process.env.TMPDIR ?? "/tmp/";
  const sep = base.endsWith("/") ? "" : "/";
  const dir = `${base}${sep}store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { dir };
});

vi.mock("../src/env.js", () => ({ CHART_DATA_DIR: ctx.dir }));

const { allocateId, listCharts, loadChart, saveChart, deleteChart } = await import("../src/services/store.js");

function doc(id: string, overrides: Partial<ChartDoc> = {}): ChartDoc {
  return {
    id,
    schema_version: 2,
    type: "intraday",
    title: `${id} title`,
    symbol: "MU.US",
    created_at: "2026-07-02T14:00:00.000Z",
    updated_at: "2026-07-02T14:00:00.000Z",
    input: {},
    built: { kind: "intraday" } as unknown as ChartDoc["built"],
    ...overrides,
  };
}

afterAll(async () => {
  await fs.rm(ctx.dir, { recursive: true, force: true });
});

describe("chart store", () => {
  it("imports pre-existing doc files into the index on first use", async () => {
    await fs.mkdir(ctx.dir, { recursive: true });
    await fs.writeFile(join(ctx.dir, "2026-07-01-legacy.json"), JSON.stringify(doc("2026-07-01-legacy")));
    const metas = await listCharts();
    expect(metas.map((m) => m.id)).toContain("2026-07-01-legacy");
  });

  it("saves a doc to file and index, newest first", async () => {
    await saveChart(doc("2026-07-02-a", { created_at: "2026-07-02T15:00:00.000Z" }));
    await saveChart(doc("2026-07-02-b", { created_at: "2026-07-02T16:00:00.000Z", type: "sepa" }));
    const metas = await listCharts();
    expect(metas[0].id).toBe("2026-07-02-b");
    const loaded = await loadChart("2026-07-02-a");
    expect(loaded?.title).toBe("2026-07-02-a title");
  });

  it("filters by type, symbol substring, and limit", async () => {
    expect((await listCharts({ type: "sepa" })).map((m) => m.id)).toEqual(["2026-07-02-b"]);
    expect((await listCharts({ symbol: "mu" })).length).toBeGreaterThanOrEqual(2);
    expect(await listCharts({ limit: 1 })).toHaveLength(1);
  });

  it("upserts on re-save instead of duplicating", async () => {
    await saveChart(doc("2026-07-02-a", { title: "updated", created_at: "2026-07-02T15:00:00.000Z" }));
    const metas = (await listCharts()).filter((m) => m.id === "2026-07-02-a");
    expect(metas).toHaveLength(1);
    expect(metas[0].title).toBe("updated");
  });

  it("deletes the doc file and the index row", async () => {
    expect(await deleteChart("2026-07-02-a")).toBe(true);
    expect(await loadChart("2026-07-02-a")).toBeNull();
    expect((await listCharts()).map((m) => m.id)).not.toContain("2026-07-02-a");
    expect(await deleteChart("2026-07-02-a")).toBe(false);
  });

  describe("allocateId", () => {
    it("returns base id when nothing exists", async () => {
      expect(await allocateId("2026-08-01", "mu-intraday")).toBe("2026-08-01-mu-intraday");
    });

    it("reuses base id when existing doc is a preview shell (no prediction/context)", async () => {
      await saveChart(doc("2026-08-02-mu-intraday", { input: {} }));
      expect(await allocateId("2026-08-02", "mu-intraday")).toBe("2026-08-02-mu-intraday");
    });

    it("suffixes when existing doc has a user prediction", async () => {
      await saveChart(doc("2026-08-03-mu-intraday", { input: { prediction: { direction: "long" } } as ChartDoc["input"] }));
      expect(await allocateId("2026-08-03", "mu-intraday")).toBe("2026-08-03-mu-intraday-2");
    });

    it("suffixes when existing doc has only context (no prediction)", async () => {
      await saveChart(
        doc("2026-08-04-mu-intraday", { input: { context: { conclusion: { stance: "neutral" } } } as ChartDoc["input"] }),
      );
      expect(await allocateId("2026-08-04", "mu-intraday")).toBe("2026-08-04-mu-intraday-2");
    });

    it("skips preview shells in the -N chain and returns the first non-existing slot", async () => {
      await saveChart(doc("2026-08-05-mu-intraday", { input: { prediction: { direction: "short" } } as ChartDoc["input"] }));
      await saveChart(doc("2026-08-05-mu-intraday-2", { input: {} }));
      expect(await allocateId("2026-08-05", "mu-intraday")).toBe("2026-08-05-mu-intraday-2");
    });
  });

  describe("deleteChart", () => {
    it("purges an orphan index row when the doc file is missing", async () => {
      await saveChart(doc("2026-08-06-orphan"));
      await fs.rm(join(ctx.dir, "2026-08-06-orphan.json"));
      expect(await deleteChart("2026-08-06-orphan")).toBe(true);
      expect((await listCharts()).map((m) => m.id)).not.toContain("2026-08-06-orphan");
      expect(await deleteChart("2026-08-06-orphan")).toBe(false);
    });
  });
});
