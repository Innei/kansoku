import { afterEach, describe, expect, it } from 'vitest';
import { ClientError } from '../src/platform/errors.js';
import { createYahooClient, getYahooClient, resetYahooClient } from '../src/marketdata/yahoo/client.js';

interface FakeCall {
  url: string;
  headers: Record<string, string>;
}

function makeClock(start = 0) {
  let time = start;
  const sleeps: number[] = [];
  return {
    now: () => time,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      time += ms;
    },
    sleeps,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

function makeFetch(responses: Response[]) {
  const calls: FakeCall[] = [];
  const queue = [...responses];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), headers: (init?.headers as Record<string, string>) ?? {} });
    const response = queue.shift();
    if (!response) throw new Error('no more fake responses queued');
    return response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('createYahooClient', () => {
  it('performs no network activity until the first getJson call', () => {
    const { calls } = makeFetch([]);
    createYahooClient({ fetchImpl: makeFetch([]).fetchImpl });
    expect(calls.length).toBe(0);
  });

  it('handshakes once, attaches cookie to subsequent requests, and fetches crumb once only when requested', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc123' } });
    const crumbResponse = new Response('the-crumb', { status: 200 });
    const dataResponse1 = jsonResponse(200, { ok: 1 });
    const dataResponse2 = jsonResponse(200, { ok: 2 });
    const { fetchImpl, calls } = makeFetch([cookieResponse, crumbResponse, dataResponse1, dataResponse2]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    const result1 = await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL', { crumb: true });
    const result2 = await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');

    expect(result1).toEqual({ ok: 1 });
    expect(result2).toEqual({ ok: 2 });
    expect(calls).toHaveLength(4);
    expect(calls[0].url).toBe('https://fc.yahoo.com/');
    expect(calls[1].url).toBe('https://query1.finance.yahoo.com/v1/test/getcrumb');
    expect(calls[1].headers.Cookie).toBe('A1=abc123');
    expect(calls[2].url).toBe(
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?crumb=the-crumb',
    );
    expect(calls[2].headers.Cookie).toBe('A1=abc123');
    expect(calls[2].headers['User-Agent']).toContain('Mozilla');
    expect(calls[3].url).toBe('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');
    expect(calls[3].headers.Cookie).toBe('A1=abc123');
  });

  it('refreshes cookie+crumb and retries once on 401, then succeeds', async () => {
    const cookieResponse1 = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=first' } });
    const dataResponse401 = new Response(null, { status: 401 });
    const cookieResponse2 = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=second' } });
    const dataResponseOk = jsonResponse(200, { ok: true });
    const { fetchImpl, calls } = makeFetch([cookieResponse1, dataResponse401, cookieResponse2, dataResponseOk]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL');

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(4);
    expect(calls[0].url).toBe('https://fc.yahoo.com/');
    expect(calls[2].url).toBe('https://fc.yahoo.com/');
    expect(calls[3].headers.Cookie).toBe('A1=second');
  });

  it('throws ClientError when the retried request still fails with 401', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const dataResponse401a = new Response(null, { status: 401 });
    const cookieResponse2 = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc2' } });
    const dataResponse401b = new Response(null, { status: 401 });
    const { fetchImpl } = makeFetch([cookieResponse, dataResponse401a, cookieResponse2, dataResponse401b]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    await expect(client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL')).rejects.toThrow(
      ClientError,
    );
  });

  it('backs off on 429 with 1s then 2s waits and returns data on a later attempt', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const rate1 = new Response(null, { status: 429 });
    const rate2 = new Response(null, { status: 429 });
    const ok = jsonResponse(200, { ok: 'third-try' });
    const { fetchImpl } = makeFetch([cookieResponse, rate1, rate2, ok]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL');

    expect(result).toEqual({ ok: 'third-try' });
    expect(clock.sleeps.slice(-2)).toEqual([1000, 2000]);
  });

  it('throws ClientError after three consecutive 429 responses', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const rate1 = new Response(null, { status: 429 });
    const rate2 = new Response(null, { status: 429 });
    const rate3 = new Response(null, { status: 429 });
    const { fetchImpl } = makeFetch([cookieResponse, rate1, rate2, rate3]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    await expect(client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL')).rejects.toThrow(
      ClientError,
    );
    expect(clock.sleeps.slice(-2)).toEqual([1000, 2000]);
  });

  it('throttles so two immediate getJson calls have request starts spaced by minIntervalMs', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const ok1 = jsonResponse(200, { n: 1 });
    const ok2 = jsonResponse(200, { n: 2 });
    const { fetchImpl } = makeFetch([cookieResponse, ok1, ok2]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep, minIntervalMs: 250 });

    await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL');
    await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');

    expect(clock.sleeps).toContain(250);
  });

  it('does not additionally throttle when enough time has already passed between calls', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const seed = jsonResponse(200, { n: 0 });
    const ok1 = jsonResponse(200, { n: 1 });
    const ok2 = jsonResponse(200, { n: 2 });
    const { fetchImpl } = makeFetch([cookieResponse, seed, ok1, ok2]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep, minIntervalMs: 250 });

    await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/SEED');
    clock.sleeps.length = 0;
    clock.advance(1000);
    await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL');
    clock.advance(1000);
    await client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');

    expect(clock.sleeps).toEqual([]);
  });

  it('throws ClientError on a non-OK, non-retryable status like 500', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const serverError = new Response('boom', { status: 500 });
    const { fetchImpl } = makeFetch([cookieResponse, serverError]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    await expect(client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL')).rejects.toThrow(
      ClientError,
    );
  });

  it('throws ClientError when an OK response body is not valid JSON', async () => {
    const cookieResponse = new Response(null, { status: 204, headers: { 'set-cookie': 'A1=abc' } });
    const badJson = new Response('not json{', { status: 200 });
    const { fetchImpl } = makeFetch([cookieResponse, badJson]);
    const clock = makeClock();
    const client = createYahooClient({ fetchImpl, now: clock.now, sleep: clock.sleep });

    await expect(client.getJson('https://query1.finance.yahoo.com/v8/finance/chart/AAPL')).rejects.toThrow(
      ClientError,
    );
  });
});

describe('getYahooClient / resetYahooClient', () => {
  afterEach(() => {
    resetYahooClient();
  });

  it('lazily creates a shared singleton and reuses it on subsequent calls', () => {
    const first = getYahooClient();
    const second = getYahooClient();
    expect(second).toBe(first);
  });

  it('creates a fresh instance after resetYahooClient', () => {
    const first = getYahooClient();
    resetYahooClient();
    const second = getYahooClient();
    expect(second).not.toBe(first);
  });
});
