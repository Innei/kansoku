import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decryptProBlob } from "@kansoku/core/pro/encLoader";
import { parseBundleManifest } from "@kansoku/core/pro/editionLoader";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const proDir = join(repoRoot, "apps", "pro");

function resolveGitHead(cwd) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
}

function main() {
  const encPath = resolve(repoRoot, process.argv[2] ?? join("apps", "pro", "dist-enc", "pro.enc"));

  if (!existsSync(proDir)) {
    console.log("verifyBundleCommit: apps/pro absent (free build) — skipping bundle commit check");
    process.exit(0);
  }
  if (!existsSync(encPath)) {
    console.log(`verifyBundleCommit: ${encPath} not found — no pro bundle was built, skipping`);
    process.exit(0);
  }

  const keyHex = process.env.KANSOKU_BUNDLE_KEY;
  if (!keyHex) {
    console.error("verifyBundleCommit: KANSOKU_BUNDLE_KEY is not set");
    process.exit(1);
  }

  let manifest;
  try {
    const blob = readFileSync(encPath);
    manifest = decryptProBlob(blob, keyHex);
  } catch (cause) {
    console.error(`verifyBundleCommit: failed to decrypt ${encPath}: ${cause.message}`);
    process.exit(1);
  }

  const bundleResult = parseBundleManifest(manifest.files);
  if (!bundleResult.ok) {
    console.error(`verifyBundleCommit: invalid bundle.json in ${encPath}: ${bundleResult.message}`);
    process.exit(1);
  }
  const bundle = bundleResult.value;

  const actualPublicCommit = resolveGitHead(repoRoot);
  const actualProCommit = resolveGitHead(proDir);

  // This is a self-consistency check only: CI has no access to the workspace
  // superproject's separately-pinned known-good combination (that verification
  // lives in the workspace's own verify.sh, out of scope here).
  const mismatches = [];
  if (bundle.publicCommit !== actualPublicCommit) {
    mismatches.push(`publicCommit: bundle=${bundle.publicCommit} actual(HEAD)=${actualPublicCommit}`);
  }
  if (bundle.proCommit !== actualProCommit) {
    mismatches.push(`proCommit: bundle=${bundle.proCommit} actual(apps/pro HEAD)=${actualProCommit}`);
  }

  if (mismatches.length > 0) {
    console.error(`verifyBundleCommit: bundle.json commit mismatch in ${encPath}`);
    for (const mismatch of mismatches) console.error(`  ${mismatch}`);
    process.exit(1);
  }

  console.log(
    `verifyBundleCommit: OK — bundle.json matches checked-out heads (publicCommit=${actualPublicCommit}, proCommit=${actualProCommit})`,
  );
}

main();
