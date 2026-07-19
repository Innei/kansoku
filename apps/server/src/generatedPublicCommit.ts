import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export function readGeneratedPublicCommit(): string | undefined {
  try {
    const path = join(moduleDir, 'generated', 'public-commit.json');
    if (!existsSync(path)) return undefined;
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'publicCommit' in parsed &&
      typeof (parsed as { publicCommit: unknown }).publicCommit === 'string'
    ) {
      return (parsed as { publicCommit: string }).publicCommit;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
