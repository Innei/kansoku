import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(desktopRoot, "package.json"));

function run(script) {
  const result = spawnSync("pnpm", ["run", script], { cwd: desktopRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// ELECTRON_RUN_AS_NODE boots Electron's embedded Node, so the probe exercises
// the exact ABI the app will load — a plain `node -e` probe would pass on a
// Node-ABI binary that Electron then crashes on.
const probe = spawnSync(require("electron"), ["-e", "new (require('better-sqlite3'))(':memory:').close()"], {
  cwd: desktopRoot,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  stdio: "pipe",
});
if (probe.status !== 0) {
  console.log("[ensureDevNative] better-sqlite3 is not built for Electron — rebuilding");
  run("rebuild-native");
} else {
  console.log("[ensureDevNative] better-sqlite3 OK for Electron ABI, skipping rebuild");
}

const bridgeRoot = join(desktopRoot, "native", "sparkle-bridge");
const bridgeReady =
  existsSync(join(bridgeRoot, "build", "Release", "sparkle_bridge.node")) &&
  existsSync(join(bridgeRoot, "vendor", "Sparkle.framework"));
if (!bridgeReady) {
  console.log("[ensureDevNative] sparkle-bridge addon missing — building");
  run("build:native");
} else {
  console.log("[ensureDevNative] sparkle-bridge addon present, skipping build (run `pnpm build:native` after changing its sources)");
}
