// require('electron') lazily downloads the binary when the postinstall was
// skipped (pnpm build-script gating / cached store). Left to the test workers,
// several hit that download concurrently and race the same dist/ extraction
// (CI-proven: locales/*.pak collision). Importing once here serializes it.
export default async function ensureElectronBinary(): Promise<void> {
  await import('electron');
}
