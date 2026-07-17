import { afterEach, describe, expect, it } from "vitest";
import {
  clearLicenseRequired,
  getLicenseRequiredModeSnapshotForTests,
  isLicenseRequiredErrorCode,
  markLicenseRequired,
  resetLicenseRequiredModeForTests,
  subscribeForTests,
} from "./licenseRequiredMode";

describe("isLicenseRequiredErrorCode", () => {
  it("flags a 403 LICENSE_REQUIRED", () => {
    expect(isLicenseRequiredErrorCode(403, "LICENSE_REQUIRED")).toBe(true);
  });

  it("does not flag a 403 without the license code", () => {
    expect(isLicenseRequiredErrorCode(403, "SOME_OTHER_CODE")).toBe(false);
    expect(isLicenseRequiredErrorCode(403, undefined)).toBe(false);
  });

  it("does not flag a non-403 status even with the license code", () => {
    expect(isLicenseRequiredErrorCode(400, "LICENSE_REQUIRED")).toBe(false);
  });
});

describe("license-required mode store", () => {
  afterEach(() => {
    resetLicenseRequiredModeForTests();
  });

  it("starts inactive", () => {
    expect(getLicenseRequiredModeSnapshotForTests()).toBe(false);
  });

  it("markLicenseRequired flips active and notifies subscribers once", () => {
    let notified = 0;
    const unsubscribe = subscribeForTests(() => notified++);
    markLicenseRequired();
    expect(getLicenseRequiredModeSnapshotForTests()).toBe(true);
    expect(notified).toBe(1);
    markLicenseRequired();
    expect(notified).toBe(1);
    unsubscribe();
  });

  it("clearLicenseRequired resets to inactive", () => {
    markLicenseRequired();
    clearLicenseRequired();
    expect(getLicenseRequiredModeSnapshotForTests()).toBe(false);
  });
});
