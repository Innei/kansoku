import type { EditionErrorCode } from "./editionLoader.js";
import { validateEditionBundle } from "./editionLoader.js";

export type EditionWebManifestState = "absent" | "locked" | "active" | "incompatible" | "failed";

export interface EditionWebManifestResult {
  state: EditionWebManifestState;
  files: Map<string, Buffer> | null;
  entryPath: string | null;
  errorCode: EditionErrorCode | null;
}

export interface ReadEditionWebManifestOptions {
  encPath: string;
  keyHex: string | null;
  expectedPublicCommit?: string;
}

function emptyResult(state: EditionWebManifestState, errorCode: EditionErrorCode | null = null): EditionWebManifestResult {
  return { state, files: null, entryPath: null, errorCode };
}

export async function readEditionWebManifest(
  options: ReadEditionWebManifestOptions,
): Promise<EditionWebManifestResult> {
  const validation = validateEditionBundle({
    encPath: options.encPath,
    keyHex: options.keyHex,
    expectedPublicCommit: options.expectedPublicCommit,
  });

  if (validation.state === "absent") return emptyResult("absent");
  if (validation.state === "locked") return emptyResult("locked");
  if (validation.state === "failed") return emptyResult(validation.state, validation.code);
  if (validation.state === "incompatible") return emptyResult(validation.state, validation.code);

  const { manifest, bundle } = validation;
  const entryPath = bundle.entries.web;
  if (entryPath === undefined || manifest.files[entryPath] === undefined) {
    return emptyResult("incompatible", "PRO_EDITION_ENTRY_MISSING");
  }

  const files = new Map<string, Buffer>();
  for (const [rel, base64] of Object.entries(manifest.files) as [string, string][]) {
    files.set(rel, Buffer.from(base64, "base64"));
  }

  return { state: "active", files, entryPath, errorCode: null };
}
