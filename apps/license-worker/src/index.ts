import type { Env } from "./env.js";
import { handleActivate, handleDeactivate, handleValidate, type ProxyDeps } from "./dodoProxy.js";
import { createThrottle } from "./throttle.js";

const sharedThrottle = createThrottle();

export function createRequestHandler(deps: ProxyDeps): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });

    const url = new URL(request.url);
    switch (url.pathname) {
      case "/activate":
        return handleActivate(request, deps);
      case "/validate":
        return handleValidate(request, deps);
      case "/deactivate":
        return handleDeactivate(request, deps);
      default:
        return new Response("not found", { status: 404 });
    }
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = createRequestHandler({
      fetch: globalThis.fetch,
      env,
      throttle: sharedThrottle,
      now: () => Date.now(),
    });
    return handler(request);
  },
};
