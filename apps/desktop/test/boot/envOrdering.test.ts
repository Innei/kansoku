import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bundled boot ordering', () => {
  const distDir = join(import.meta.dirname, '..', '..', 'dist-main');
  const bundlePath = join(distDir, 'main.mjs');

  it.skipIf(!existsSync(bundlePath))(
    "sets TRADE_PROJECT_ROOT before packages/core/src/env.ts's top-level APP_ROOT const evaluates",
    () => {
      const content = readFileSync(bundlePath, 'utf8');
      const bootEnvIndex = content.indexOf('process.env.TRADE_PROJECT_ROOT = dataRoot');
      expect(bootEnvIndex).toBeGreaterThanOrEqual(0);

      // tsdown emitted `const`, rolldown emits `var` — accept both.
      const appRootDecl = /(?:const|var) APP_ROOT =/;
      const envConstInMain = content.search(appRootDecl);
      if (envConstInMain >= 0) {
        expect(bootEnvIndex).toBeLessThan(envConstInMain);
        return;
      }

      const chunkNames = readdirSync(distDir).filter(
        (name) => name.endsWith('.mjs') && name !== 'main.mjs',
      );
      const chunkContent = new Map(
        chunkNames.map((name) => [name, readFileSync(join(distDir, name), 'utf8')]),
      );
      const envChunk = chunkNames.find((name) => appRootDecl.test(chunkContent.get(name)!));
      expect(envChunk).toBeDefined();

      // Static imports evaluate before main.mjs's own top-level code, so the
      // ordering holds exactly when the env chunk is unreachable over STATIC
      // import edges from main.mjs — dynamic-import indirection shapes are up
      // to the bundler and irrelevant.
      const staticImports = (source: string) =>
        [...source.matchAll(/(?:from|import)\s+"\.\/([^"]+)"/g)].map((m) => m[1]);
      const reachable = new Set<string>();
      const queue = staticImports(content);
      while (queue.length > 0) {
        const name = queue.pop()!;
        if (reachable.has(name)) continue;
        reachable.add(name);
        const source = chunkContent.get(name);
        if (source) queue.push(...staticImports(source));
      }
      expect(reachable.has(envChunk!)).toBe(false);
    },
  );
});
