import { currentSnapshotSafe, isLicensed } from '../../license/licenseGate.js';
import type { CapabilitiesApi } from '../../contract/capabilities.js';
import { LegacyEditionRuntimeStatusReader } from '../../pro/domain/legacyAdapters.js';
import type { EditionRuntimeStatusReader } from '../../pro/editionRuntime.js';
import { featureStates } from '../../pro/features.js';

export function createCapabilitiesService(
  statusReader: EditionRuntimeStatusReader,
): CapabilitiesApi {
  return {
    async get() {
      const status = statusReader.status;
      return {
        pro: status.state === 'active',
        licensed: isLicensed(),
        license: currentSnapshotSafe(),
        features: await featureStates(),
        hasEncBundle: status.bundlePresent,
      };
    },
  };
}

export const capabilitiesService: CapabilitiesApi = createCapabilitiesService(
  new LegacyEditionRuntimeStatusReader(),
);
