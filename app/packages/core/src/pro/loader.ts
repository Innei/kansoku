import { pathToFileURL } from "node:url";
import type { ProModule } from "@kansoku/pro-api";
import { registerProModule } from "./registry.js";

// Relative filesystem path to the gitignored slot rather than a bare package
// specifier: nothing declares @kansoku/pro as a dependency (public code must
// not), so pnpm never links it into node_modules and a bare import would not
// resolve. Built from variables so bundlers cannot statically resolve it;
// when app/pro is absent the import throws and we fall back to free mode.
//
// The default (no `appDir`) resolves relative to this module's own URL, which
// only lines up with the real app/pro/src/index.js when this file still runs
// from its source location (true for the server host, which runs TS directly
// via vite-node). Once a host bundles this module into a single file at a
// different directory depth (the Electron main process, via tsdown), that
// relative arithmetic breaks — such hosts must pass their own app root as
// `appDir` (e.g. Electron's `app.getAppPath()`) instead.
function proEntryUrl(appDir?: string): string {
  if (appDir) {
    return pathToFileURL([appDir, "..", "pro", "src", "index.js"].join("/")).href;
  }
  return ["..", "..", "..", "..", "pro", "src", "index.js"].join("/");
}

export async function loadPro(appDir?: string): Promise<boolean> {
  try {
    const mod = (await import(proEntryUrl(appDir))) as { default?: ProModule } & Partial<ProModule>;
    const proModule = mod.default ?? (mod as ProModule);
    registerProModule(proModule);
    return true;
  } catch {
    console.info("pro slot: @kansoku/pro not found, running in free mode");
    return false;
  }
}
