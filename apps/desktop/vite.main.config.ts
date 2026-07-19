import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const desktopDir = fileURLToPath(new URL('.', import.meta.url));
const proEntry = fileURLToPath(new URL('../pro/src/index.ts', import.meta.url));
const proPresent = process.env.KANSOKU_FORCE_FREE !== '1' && existsSync(proEntry);
const isDev = process.env.KANSOKU_DESKTOP_DEV === '1';

const PRO_SRC_MARKER = '/apps/pro/src/';
const isProModule = (id: string) => id.includes(PRO_SRC_MARKER);

// The __pro__ chunk boundary IS the paid-code boundary: stagePro.mjs encrypts
// dist-main/__pro__/ into pro.enc and deletes the plaintext. Two invariants,
// both build-fatal:
//   1. no pro/src module may end up in a chunk outside __pro__/ (it would ship
//      unencrypted);
//   2. no chunk outside __pro__/ may import a __pro__/ chunk (shared code
//      swallowed into the encrypted dir would crash free builds and packaged
//      startup — proven failure when rolldown's manualChunks compat dragged
//      1300+ shared modules into the pro bucket).
// afterPack.cjs adds a third, canary-based check on the final asar.
function proLeakGuard(): Plugin {
  return {
    name: 'kansoku:pro-leak-guard',
    generateBundle(_options, bundle) {
      const problems: string[] = [];
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || fileName.startsWith('__pro__/')) continue;
        for (const id of Object.keys(chunk.modules)) {
          if (isProModule(id)) problems.push(`pro module outside __pro__ — ${fileName}: ${id}`);
        }
        for (const imported of [...chunk.imports, ...chunk.dynamicImports]) {
          if (imported.startsWith('__pro__/')) {
            const target = bundle[imported];
            const targetModules =
              target?.type === 'chunk' ? Object.keys(target.modules).join('\n      ') : '?';
            problems.push(
              `public chunk imports encrypted chunk — ${fileName} -> ${imported}\n    importer modules:\n      ${Object.keys(chunk.modules).join('\n      ')}\n    target modules:\n      ${targetModules}`,
            );
          }
        }
      }
      if (problems.length > 0) {
        this.error(`pro chunk boundary violated:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
      }
    },
  };
}

export default defineConfig({
  root: desktopDir,

  define: {
    __DESKTOP_DEV__: JSON.stringify(isDev),
  },
  ssr: {
    // Single-graph invariant: everything JS is bundled so main and the pro
    // chunk share one module instance of every dep (tsuki decorator metadata
    // keys on module-local Symbols — two copies would split the registry).
    // Only host-provided electron and the two native packages stay external,
    // which is also exactly the set electron-builder ships in node_modules.
    noExternal: true,
    external: ['better-sqlite3', 'electron-sparkle-updater'],
  },
  build: {
    ssr: true,
    outDir: 'dist-main',
    emptyOutDir: true,
    minify: false,
    target: 'node24',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
        ...(proPresent ? { pro: proEntry } : {}),
      },
      external: [/^electron($|\/)/, /^better-sqlite3($|\/)/, /^electron-sparkle-updater($|\/)/],
      output: {
        format: 'es',
        // Default chunking already isolates pro: modules reachable only from
        // the pro entry stay in its chunks, shared modules split into common
        // chunks. (manualChunks is NOT usable here — rolldown's compat drags
        // the pinned modules' dependencies into the group, swallowing shared
        // code into the encrypted dir.) These two callbacks only ROUTE any
        // chunk containing pro/src modules under __pro__/ so stagePro can
        // encrypt the directory wholesale; proLeakGuard enforces the split.
        entryFileNames: (chunk) => (chunk.name === 'pro' ? '__pro__/index.mjs' : '[name].mjs'),
        // facadeModuleId covers module-less re-export facades (a dynamic
        // import inside pro emits one; it carries no moduleIds).
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some(isProModule) ||
          (chunk.facadeModuleId != null && isProModule(chunk.facadeModuleId))
            ? '__pro__/[name]-[hash].mjs'
            : '[name]-[hash].mjs',
      },
    },
  },
  plugins: [proLeakGuard()],
});
