import { afterEach, describe, expect, it, vi } from "vitest";
import { allRoutes } from "../../../packages/core/src/contract/index.js";
import { ApiError } from "../api";
import { getRestrictedModeSnapshotForTests, resetRestrictedModeForTests } from "../restrictedMode";
import { createHttpClient } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("createHttpClient", () => {
  afterEach(() => {
    resetRestrictedModeForTests();
    vi.unstubAllGlobals();
  });

  it("substitutes path params and drops them from the query", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: true, data: { id: "abc" } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await client.charts.get({ id: "abc" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/charts/abc");
  });

  it("builds a query string from leftover input, skipping undefined values", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await client.charts.list({ type: "flow,cohort", symbol: undefined, limit: 5, stale: true });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/charts?type=flow%2Ccohort&limit=5&stale=true");
  });

  it("sends a JSON body for POST/PATCH/PUT with the remaining fields", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: true, data: { id: "x" }, meta: { created: true } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await client.charts.create({ type: "sepa", symbol: "MRVL.US" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/charts");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ type: "sepa", symbol: "MRVL.US" });
  });

  it("reassembles {data, meta} for withMeta routes", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: true, data: { id: "x" }, meta: { created: true } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    const result = await client.charts.create({ type: "sepa" });
    expect(result).toEqual({ data: { id: "x" }, meta: { created: true } });
  });

  it("does not wrap the result for non-withMeta routes", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: true, data: [{ id: "a" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    const result = await client.charts.list();
    expect(result).toEqual([{ id: "a" }]);
  });

  it("throws ApiError on an ok:false envelope and marks restricted mode on a credentials 503", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: false, error: "not configured", code: "NO_CREDENTIALS" }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await expect(client.positions.list()).rejects.toThrow(ApiError);
    expect(getRestrictedModeSnapshotForTests().restricted).toBe(true);
  });

  it("does not mark restricted mode for an unrelated error", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ ok: false, error: "not found" }, 404));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await expect(client.charts.get({ id: "x" })).rejects.toThrow(ApiError);
    expect(getRestrictedModeSnapshotForTests().restricted).toBe(false);
  });

  it("throws on a malformed envelope", async () => {
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => jsonResponse({ not: "an envelope" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await expect(client.positions.list()).rejects.toThrow(ApiError);
  });

  it("throws on invalid JSON", async () => {
    const fetchMock = vi.fn(async () => new Response("not json", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpClient(allRoutes);

    await expect(client.positions.list()).rejects.toThrow(ApiError);
  });
});
