import { setEncBundlePresent as setRegistryEncBundlePresent } from './registry.js';

// Delegates to the old ABI's registry flag rather than holding separate state:
// apps/desktop/src/boot/proActivationWatch.ts still reads presence through
// registry.hasEncBundle() to decide when to prompt for a relaunch; the
// capabilities service (packages/core/src/modules/capabilities/capabilities.service.ts,
// behind GET /api/capabilities) and packages/core/src/pro/features.ts (feature-tier
// gating) also read it directly, and none of those callers are in scope for this task.
export function setEncBundlePresent(present: boolean): void {
  setRegistryEncBundlePresent(present);
}
