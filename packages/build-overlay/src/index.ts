import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';

const { dirname, extname, isAbsolute, resolve } = path;

export interface ProOverlayOptions {
  enabled?: boolean;
}

export interface ProOverlayPlugin {
  name: string;
  enforce: 'pre';
  resolveId(source: string, importer?: string): string | null;
}

const extensionCandidates: Readonly<Record<string, readonly string[]>> = {
  '': ['.pro.ts', '.pro.tsx', '.pro.mts', '.pro.cts'],
  '.cjs': ['.pro.cts'],
  '.cts': ['.pro.cts'],
  '.js': ['.pro.ts', '.pro.tsx'],
  '.jsx': ['.pro.tsx'],
  '.mjs': ['.pro.mts'],
  '.mts': ['.pro.mts'],
  '.ts': ['.pro.ts'],
  '.tsx': ['.pro.tsx'],
};

function splitQuery(id: string): { path: string; query: string } {
  const queryIndex = id.search(/[#?]/);
  if (queryIndex === -1) return { path: id, query: '' };
  return { path: id.slice(0, queryIndex), query: id.slice(queryIndex) };
}

/** Resolve a project-local import to its colocated `.pro` projection. */
export function resolveProOverlayId(
  source: string,
  importer: string | undefined,
  options: ProOverlayOptions = {},
): string | null {
  if (options.enabled === false || !importer || !source.startsWith('.')) return null;
  if (source.includes('\0') || importer.includes('\0')) return null;

  const sourceParts = splitQuery(source);
  const importerPath = splitQuery(importer).path;
  if (!isAbsolute(importerPath) || sourceParts.path.includes('.pro.')) return null;

  const sourceExtension = extname(sourceParts.path);
  const suffixes = extensionCandidates[sourceExtension];
  if (!suffixes) return null;

  const stem = sourceExtension
    ? sourceParts.path.slice(0, -sourceExtension.length)
    : sourceParts.path;
  for (const suffix of suffixes) {
    const candidate = resolve(dirname(importerPath), `${stem}${suffix}`);
    if (existsSync(candidate) && lstatSync(candidate).isSymbolicLink()) {
      return `${candidate}${sourceParts.query}`;
    }
  }
  return null;
}

/** A resolver hook shared by Vite and tsdown/Rolldown. */
export function proOverlayPlugin(options: ProOverlayOptions = {}): ProOverlayPlugin {
  return {
    name: 'kansoku-pro-overlay',
    enforce: 'pre',
    resolveId(source, importer) {
      return resolveProOverlayId(source, importer, options);
    },
  };
}
