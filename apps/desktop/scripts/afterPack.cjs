'use strict';

const { readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const EXPECTED_BETTER_SQLITE3_FILES = ['build/Release/better_sqlite3.node'];
const ALLOWED_PRO_ENTRY = 'pro/pro.enc';
// Marker only ever emitted by tsdown's `//#region` output for apps/pro's own
// source tree (verified: present in apps/pro/dist/**/*.mjs, absent from
// apps/desktop/dist-main and apps/server/dist). A hit inside app.asar means
// unencrypted pro source leaked into the packaged bundle.
const PLAINTEXT_PRO_MARKER = 'src/editions/desktop.ts';

function listFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : [relative(root, path)];
  });
}

function verifyBetterSqlite3Payload(context) {
  const resourcesDir = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents',
    'Resources',
  );
  const unpackedModuleDir = join(
    resourcesDir,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
  );
  const files = listFiles(unpackedModuleDir).sort();

  if (files.join('\n') !== EXPECTED_BETTER_SQLITE3_FILES.join('\n')) {
    throw new Error(
      `Unexpected better-sqlite3 unpacked payload:\n${files.map((file) => `- ${file}`).join('\n')}`,
    );
  }

  const nativeBinary = join(unpackedModuleDir, EXPECTED_BETTER_SQLITE3_FILES[0]);
  if (statSync(nativeBinary).size === 0) {
    throw new Error('Packaged better_sqlite3.node is empty');
  }
}

async function scanAppAsarForPlaintextLeaks(context) {
  const { listPackage, extractFile } = await import('@electron/asar');
  const resourcesDir = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents',
    'Resources',
  );
  const asarPath = join(resourcesDir, 'app.asar');
  const entries = listPackage(asarPath).map((entry) => entry.replace(/^\/+/, ''));

  const mapFiles = entries.filter((entry) => entry.endsWith('.map'));
  if (mapFiles.length > 0) {
    throw new Error(`app.asar contains source maps:\n${mapFiles.map((f) => `- ${f}`).join('\n')}`);
  }

  const proEntries = entries.filter(
    (entry) => entry === 'pro' || entry.startsWith('pro/') || entry.includes('/pro/'),
  );
  const strayProEntries = proEntries.filter((entry) => entry !== ALLOWED_PRO_ENTRY && entry !== 'pro');
  if (strayProEntries.length > 0) {
    throw new Error(
      `app.asar contains unexpected pro-namespaced entries (only ${ALLOWED_PRO_ENTRY} is allowed):\n${strayProEntries.map((f) => `- ${f}`).join('\n')}`,
    );
  }

  const jsChunks = entries.filter(
    (entry) => entry.startsWith('dist-main/') && (entry.endsWith('.js') || entry.endsWith('.mjs') || entry.endsWith('.cjs')),
  );
  for (const chunk of jsChunks) {
    const contents = extractFile(asarPath, chunk).toString('utf8');
    if (contents.includes(PLAINTEXT_PRO_MARKER)) {
      throw new Error(
        `app.asar chunk "${chunk}" contains unencrypted pro source (matched marker "${PLAINTEXT_PRO_MARKER}")`,
      );
    }
  }
}

module.exports = async function afterPack(context) {
  verifyBetterSqlite3Payload(context);
  await scanAppAsarForPlaintextLeaks(context);
  const { adHocSignAfterPack } = await import('electron-sparkle-updater/builder');
  return adHocSignAfterPack(context);
};

module.exports.scanAppAsarForPlaintextLeaks = scanAppAsarForPlaintextLeaks;
