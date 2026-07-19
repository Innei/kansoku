import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(scriptDir, '..', '..', '..');
const outDir = join(scriptDir, '..', 'src', 'generated');
const outFile = join(outDir, 'public-commit.json');

try {
  const publicCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: publicRoot,
    encoding: 'utf8',
  }).trim();

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify({ publicCommit }));
} catch (error) {
  console.warn(
    `[generatePublicCommit] could not resolve public commit (${error instanceof Error ? error.message : String(error)}) — continuing without embedded commit`,
  );
}
