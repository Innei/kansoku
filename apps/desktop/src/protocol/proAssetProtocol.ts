import { extname } from 'node:path';
import { protocol } from 'electron';
import type { EditionWebManifestResult } from '@kansoku/core/pro/webManifest';
import { guardStaticPath, lookupMimeType as lookupStaticMimeType } from './protocol.js';

export const PRO_ASSET_SCHEME = 'pro-asset';

export function registerProAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PRO_ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

const EXTRA_MIME_TYPES: Record<string, string> = {
  '.mjs': 'application/javascript; charset=utf-8',
};

export function lookupProAssetMimeType(pathname: string): string {
  const ext = extname(pathname).toLowerCase();
  if (ext in EXTRA_MIME_TYPES) return EXTRA_MIME_TYPES[ext];
  return lookupStaticMimeType(pathname);
}

// pro-asset://web/... always carries a host of "web" (mirroring how bundle
// entries/keys are namespaced under "web/..." in the decrypted manifest) —
// resolved path is the pathname with the leading "/" stripped, traversal
// guarded the same way app:// static assets are.
export function resolveProAssetPath(requestUrl: string): string | null {
  const url = new URL(requestUrl);

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const guarded = guardStaticPath(pathname);
  if (guarded === null) return null;

  const host = url.hostname;
  return host ? `${host}/${guarded}` : guarded;
}

export function createProAssetProtocolHandler(webManifest: EditionWebManifestResult) {
  return async function handleProAssetRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Locked/absent/incompatible/failed states must never read
    // webManifest.files (it is null in every non-active state per Task 1's
    // contract) — 404 unconditionally before touching it.
    if (webManifest.state !== 'active' || webManifest.files === null) {
      return new Response('Not Found', { status: 404 });
    }

    const resolvedPath = resolveProAssetPath(request.url);
    if (resolvedPath === null) {
      return new Response('Forbidden', { status: 403 });
    }

    const body = webManifest.files.get(resolvedPath);
    if (body === undefined) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { 'content-type': lookupProAssetMimeType(resolvedPath) },
    });
  };
}

export function registerProAssetProtocolHandler(webManifest: EditionWebManifestResult): void {
  const handler = createProAssetProtocolHandler(webManifest);
  protocol.handle(PRO_ASSET_SCHEME, handler);
}
