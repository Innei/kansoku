// Loaded before the pro slot so global Reflect is patched when the pro slot's
// Tsuki controller/module decorators run inside loadPro(); otherwise their
// route metadata is written before reflect-metadata installs and Tsuki maps no
// routes. bootstrap.js also imports it, but that runs after loadPro().
import 'reflect-metadata';
import { join } from 'node:path';
import { app, ipcMain, safeStorage, shell } from 'electron';
import type { IpcServiceConstructor } from 'electron-ipc-decorator';
import type { BaseDesktopEdition } from '@kansoku/core/edition/base';
import { DefaultIpcRegistry } from '@kansoku/core/edition/ipcRegistry';
import type { DesktopEditionHost } from '@kansoku/core/edition/host';
import { DefaultRealtimeChannelRegistry } from '@kansoku/core/edition/realtimeRegistry';
import { loadEdition, loadEditionFromDevDist } from '@kansoku/core/pro/editionLoader';
import { proDevDistDir } from '@kansoku/core/pro/loader';
import { readEditionWebManifest } from '@kansoku/core/pro/webManifest';
import { createCredentialsBridgeHandlers, registerCredentialsIpc } from '../credentials/bridge.js';
import { createDesktopSecretBox } from '../credentials/secretBox.js';
import { nonAiIpcServiceClasses } from '../ipc/index.js';
import { serverEncLayout } from '../../../server/src/proEncLayout.js';
import { IS_DEV } from './env.js';
import { LegacyCompatDesktopEdition } from './legacyDesktopEdition.js';
import { startProActivationWatch } from './proActivationWatch.js';
import { promptProRelaunch } from './proRelaunch.js';

export async function bootKernel() {
  const expectedPublicCommit = app.isPackaged && __PUBLIC_COMMIT__ ? __PUBLIC_COMMIT__ : undefined;

  const [
    { initServerRuntime },
    { attachRealtimeBridge },
    { CHART_DATA_DIR },
    { hasEncBundle, isProPresent },
    { getActiveBundleKey },
  ] = await Promise.all([
    import('../../../server/src/runtimeInit.js'),
    import('../realtime/bridge.js'),
    import('@kansoku/core/env'),
    import('@kansoku/core/pro/registry'),
    import('@kansoku/core/license/licenseState'),
  ]);

  // Dev keeps the pre-P3 plaintext keyfile so ELECTRON_DEV workflows are
  // unaffected; packaged builds move the AI master key into safeStorage.
  const secretBox = IS_DEV
    ? undefined
    : createDesktopSecretBox({
        safeStorage,
        wrappedKeyPath: join(app.getPath('userData'), 'ai-master-key.json'),
        legacyKeyPath: join(CHART_DATA_DIR, 'ai-secret.key'),
      });

  const {
    host: serverHost,
    edition: serverEdition,
    protocol,
    editionSource,
  } = await initServerRuntime({
    secretBox,
    openAuthUrl: (url) => {
      shell.openExternal(url).catch(() => {});
    },
    proAppDir: app.getAppPath(),
    productionHost: app.isPackaged,
    expectedPublicCommit,
    // Packaged builds only ever stage pro.enc (see desktop/scripts/
    // stagePro.mjs) — no dist-dev/ to fall back to, so loadPro's default
    // entryFile is fine (it just fails cleanly into free mode when absent).
    // Dev boots through the edition protocol against dist-dev/ instead (see
    // proDevDistDir()/loadEditionFromDevDist() below) — it no longer loads
    // apps/pro/src/index.ts as plaintext TS.
  });
  await serverEdition.initialize();

  // bootstrap.js is imported lazily, after initServerRuntime() has awaited
  // loadPro() above, so AppModule's registry-derived AI module composition
  // sees the pro module (when present).
  const { createKernel } = await import('../../../server/src/bootstrap.js');
  const kernel = await createKernel(serverEdition);

  const ipcRegistry = new DefaultIpcRegistry();
  const realtimeRegistry = new DefaultRealtimeChannelRegistry();
  const desktopHost: DesktopEditionHost = {
    ...serverHost,
    aiRuntimeAlreadyInitialized: true,
    ipc: ipcRegistry,
    realtime: realtimeRegistry,
  };

  const { encPath, virtualDir } = serverEncLayout(app.getAppPath());
  const keyHex = getActiveBundleKey() ?? process.env.KANSOKU_BUNDLE_KEY ?? null;

  // Attempt at most one pro protocol per process (see protocolClaim.ts):
  // initServerRuntime() already resolved the server-side edition. protocol
  // is 'legacy' both when it fell back to the legacy loadPro() protocol
  // (bundle absent/locked) and when it rejected a present-but-invalid
  // bundle and ran free instead (incompatible/failed) — either way no
  // edition-protocol source is usable, so only retry the edition protocol
  // for the desktop runtime when the server side actually activated it;
  // otherwise go straight to the legacy desktop adapter. editionSource says
  // which source the server side activated from, so the desktop retry hits
  // the same one: pro.enc via loadEdition(), or dist-dev/ (dev only, design
  // §17) via loadEditionFromDevDist().
  let desktopEdition: BaseDesktopEdition;
  if (protocol === 'edition') {
    const desktopActivation =
      editionSource === 'dist-dev'
        ? await loadEditionFromDevDist<DesktopEditionHost, BaseDesktopEdition>({
            runtime: 'desktop',
            distDevDir: proDevDistDir(app.getAppPath()),
            host: desktopHost,
          })
        : await loadEdition<DesktopEditionHost, BaseDesktopEdition>({
            encPath,
            virtualDir,
            runtime: 'desktop',
            keyHex,
            host: desktopHost,
            expectedPublicCommit,
          });
    desktopEdition =
      desktopActivation.state === 'active' && desktopActivation.edition
        ? desktopActivation.edition
        : new LegacyCompatDesktopEdition(desktopHost);
  } else {
    desktopEdition = new LegacyCompatDesktopEdition(desktopHost);
  }

  // readEditionWebManifest() never calls assertProtocolAllowed/claimProtocol
  // (see packages/core/src/pro/webManifest.ts) — it only re-reads and
  // re-validates the same bundle loadEdition() above already resolved, so
  // calling it here regardless of `protocol` cannot conflict with the
  // single-pro-protocol-per-process claim made by loadEdition().
  const webManifest = await readEditionWebManifest({ encPath, keyHex, expectedPublicCommit });

  desktopEdition.configureIpc(ipcRegistry);
  desktopEdition.configureRealtime(realtimeRegistry);
  await desktopEdition.initialize();

  const apiApp = kernel.app.getInstance();
  attachRealtimeBridge(realtimeRegistry.list());
  registerCredentialsIpc(ipcMain, createCredentialsBridgeHandlers());

  const health = await apiApp.fetch(new Request('http://localhost/api/health'));
  console.log(`[desktop] kernel self-test /api/health -> ${health.status}`, await health.text());

  await desktopEdition.start();
  await serverEdition.start();

  startProActivationWatch({
    hasEncBundle,
    isProPresent,
    getBundleKey: getActiveBundleKey,
    relaunch: () => void promptProRelaunch(),
  });

  return {
    kernel,
    ipcServiceClasses: [
      ...nonAiIpcServiceClasses,
      ...(ipcRegistry.build() as unknown as IpcServiceConstructor[]),
    ] as const,
    webManifest,
    dispose: async () => {
      await Promise.allSettled([desktopEdition.dispose(), serverEdition.dispose()]);
      // Drop the decrypted files Map reference so it's GC-eligible once the
      // pro-asset protocol handler (registered against this same object in
      // main.ts) is no longer serving requests — §15.5 exit-time cleanup.
      webManifest.files = null;
    },
  };
}
