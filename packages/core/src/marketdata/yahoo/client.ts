import { ClientError } from '../../platform/errors.js';

export interface YahooClient {
  getJson(url: string, opts?: { crumb?: boolean }): Promise<unknown>;
}

export interface YahooClientOptions {
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const COOKIE_URL = 'https://fc.yahoo.com/';
const CRUMB_URL = 'https://query1.finance.yahoo.com/v1/test/getcrumb';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const YAHOO_HINT =
  'Yahoo Finance is a free, unofficial data source; it may throttle, block, or change behavior without notice.';
const DEFAULT_MIN_INTERVAL_MS = 250;
const MAX_ATTEMPTS_429 = 3;
const INITIAL_BACKOFF_MS = 1000;

function appendCrumb(url: string, crumb: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}crumb=${encodeURIComponent(crumb)}`;
}

export function createYahooClient(opts: YahooClientOptions = {}): YahooClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const minIntervalMs = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let cookie: string | undefined;
  let crumb: string | undefined;
  let lastStart: number | null = null;
  let queue: Promise<void> = Promise.resolve();

  async function throttledFetch(url: string, headers: Record<string, string>): Promise<Response> {
    const prev = queue;
    let release!: () => void;
    queue = new Promise((resolve) => {
      release = resolve;
    });
    await prev;
    if (lastStart !== null) {
      const elapsed = now() - lastStart;
      if (elapsed < minIntervalMs) await sleep(minIntervalMs - elapsed);
    }
    lastStart = now();
    release();
    return fetchImpl(url, { headers });
  }

  function invalidate(): void {
    cookie = undefined;
    crumb = undefined;
  }

  async function ensureCookie(): Promise<void> {
    if (cookie !== undefined) return;
    const response = await throttledFetch(COOKIE_URL, { 'User-Agent': USER_AGENT });
    cookie = response.headers.get('set-cookie') ?? '';
  }

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (cookie) headers.Cookie = cookie;
    return headers;
  }

  async function ensureCrumb(): Promise<void> {
    if (crumb !== undefined) return;
    const response = await throttledFetch(CRUMB_URL, buildHeaders());
    crumb = await response.text();
  }

  async function fetchWithBackoff(url: string): Promise<Response> {
    let waitMs = INITIAL_BACKOFF_MS;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_429; attempt++) {
      const response = await throttledFetch(url, buildHeaders());
      if (response.status !== 429) return response;
      if (attempt >= MAX_ATTEMPTS_429) {
        throw new ClientError('yahoo request was rate limited', YAHOO_HINT, 429);
      }
      await sleep(waitMs);
      waitMs *= 2;
    }
    throw new ClientError('yahoo request was rate limited', YAHOO_HINT, 429);
  }

  async function attemptRequest(url: string, wantsCrumb: boolean): Promise<Response> {
    await ensureCookie();
    if (wantsCrumb) await ensureCrumb();
    const finalUrl = wantsCrumb && crumb ? appendCrumb(url, crumb) : url;
    return fetchWithBackoff(finalUrl);
  }

  return {
    async getJson(url: string, opts: { crumb?: boolean } = {}): Promise<unknown> {
      const wantsCrumb = opts.crumb === true;
      let response = await attemptRequest(url, wantsCrumb);
      if (response.status === 401 || response.status === 403) {
        invalidate();
        response = await attemptRequest(url, wantsCrumb);
        if (response.status === 401 || response.status === 403) {
          throw new ClientError(
            `yahoo request failed with status ${response.status} after retrying`,
            YAHOO_HINT,
            response.status,
          );
        }
      }
      if (!response.ok) {
        throw new ClientError(`yahoo request failed with status ${response.status}`, YAHOO_HINT, response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new ClientError('failed to parse yahoo response as JSON', YAHOO_HINT, response.status);
      }
    },
  };
}

let instance: YahooClient | null = null;

export function getYahooClient(): YahooClient {
  if (!instance) instance = createYahooClient();
  return instance;
}

export function resetYahooClient(): void {
  instance = null;
}
