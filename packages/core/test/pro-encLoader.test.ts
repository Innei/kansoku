import { createCipheriv, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

const KEY_HEX = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

const HERE = dirname(fileURLToPath(import.meta.url));
const TSX_LOADER = createRequire(import.meta.url).resolve("tsx");
const LOADER_URL = `file://${join(HERE, "..", "src", "pro", "loader.ts")}`;

const NODE_FIXTURE = {
  "node/index.mjs": [
    'import { helper } from "./util.mjs";',
    'import { sharedValue } from "../shared.mjs";',
    "export const answer = helper() + sharedValue;",
  ].join("\n"),
  "node/util.mjs": "export function helper() { return 10; }\n",
  "web/entry.mjs": 'export const marker = "web-entry";\n',
};

function packEnc(files: Record<string, string>, keyHex: string): Buffer {
  const manifest = {
    keyId: "test",
    files: Object.fromEntries(Object.entries(files).map(([rel, src]) => [rel, Buffer.from(src).toString("base64")])),
  };
  const gz = gzipSync(Buffer.from(JSON.stringify(manifest)));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  const ct = Buffer.concat([cipher.update(gz), cipher.final()]);
  return Buffer.concat([Buffer.from("KPRO1", "utf8"), iv, cipher.getAuthTag(), ct]);
}

function stageAppDir(): { appDir: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), "kansoku-enc-loader-"));
  const appDir = join(root, "appRoot");
  mkdirSync(join(appDir, "pro"), { recursive: true });
  mkdirSync(join(appDir, "dist-main"), { recursive: true });
  writeFileSync(join(appDir, "pro", "pro.enc"), packEnc(NODE_FIXTURE, KEY_HEX));
  writeFileSync(join(appDir, "dist-main", "shared.mjs"), "export const sharedValue = 32;\n");
  return { appDir, root };
}

// loadPro registers virtual node modules at the exact filesystem path the
// plaintext chunk occupied (<appDir>/dist-main/__pro__/...), so their relative
// imports of real dist-main files must resolve through Node's native ESM
// resolver — vitest's vite-node runner intercepts import() before Node's own
// loader sees it, so this has to run in a spawned Node process where tsx
// transforms loader.ts and the registerHooks-based virtual loader is real.
const RUNNER = [
  'const { join } = await import("node:path");',
  'const { pathToFileURL } = await import("node:url");',
  "const { loadPro } = await import(process.env.LOADER_URL);",
  "process.env.KANSOKU_BUNDLE_KEY = process.env.KEY_HEX;",
  "const payload = await loadPro(process.env.APP_DIR);",
  'const entryPath = join(process.env.APP_DIR, "dist-main", "__pro__", "index.mjs");',
  "const mod = await import(pathToFileURL(entryPath).href);",
  "process.stdout.write(JSON.stringify({",
  "  loaded: payload !== null,",
  "  webFiles: payload ? [...payload.webFiles.keys()] : [],",
  "  webEntryContent: payload ? payload.webFiles.get(\"entry.mjs\")?.toString(\"utf8\") ?? null : null,",
  "  answer: mod.answer,",
  "}));",
].join("\n");

function runNativeLoad(appDir: string): {
  loaded: boolean;
  webFiles: string[];
  webEntryContent: string | null;
  answer: number;
} {
  const out = execFileSync(process.execPath, ["--import", TSX_LOADER, "--input-type=module", "-e", RUNNER], {
    env: {
      ...process.env,
      LOADER_URL,
      KEY_HEX,
      APP_DIR: appDir,
    },
    encoding: "utf8",
  });
  return JSON.parse(out);
}

describe("loadPro + registerVirtualModules (native ESM resolution)", () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  it("decrypts a node+web bundle and resolves the virtual entry's relative imports, including a real plaintext dist-main file", () => {
    const { appDir, root } = stageAppDir();
    roots.push(root);

    const result = runNativeLoad(appDir);

    expect(result.loaded).toBe(true);
    expect(result.answer).toBe(42);
    expect(result.webFiles).toEqual(["entry.mjs"]);
    expect(result.webEntryContent).toBe('export const marker = "web-entry";\n');
  });
});
