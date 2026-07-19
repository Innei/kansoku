'use strict';

const { readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const EXPECTED_BETTER_SQLITE3_FILES = ['build/Release/better_sqlite3.node'];

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

module.exports = async function afterPack(context) {
  verifyBetterSqlite3Payload(context);
  const { adHocSignAfterPack } = await import('electron-sparkle-updater/builder');
  return adHocSignAfterPack(context);
};
