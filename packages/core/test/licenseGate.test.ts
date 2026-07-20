import { describe, expect, it } from "vitest";
import { isBundleKeyEnvAllowed, isLicenseBypassActive } from "../src/license/licenseGate.js";

describe("isLicenseBypassActive", () => {
  it("is false when the env var is unset", () => {
    expect(isLicenseBypassActive({}, null)).toBe(false);
  });

  it("is false when the env var is set to anything other than \"1\"", () => {
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "true" }, null)).toBe(false);
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "0" }, null)).toBe(false);
  });

  it("is dead in a packaged Electron build even with the env var set to 1", () => {
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "1" }, true)).toBe(false);
  });

  it("is active in a non-packaged Electron build (dev) with the env var set", () => {
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "1" }, false)).toBe(true);
  });

  it("falls back to NODE_ENV outside Electron (isPackaged unknown/null): blocked in production", () => {
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "1", NODE_ENV: "production" }, null)).toBe(false);
  });

  it("falls back to NODE_ENV outside Electron: allowed in dev/test", () => {
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "1", NODE_ENV: "test" }, null)).toBe(true);
    expect(isLicenseBypassActive({ KANSOKU_LICENSE_BYPASS: "1" }, null)).toBe(true);
  });
});

describe("isBundleKeyEnvAllowed", () => {
  it("is dead in a packaged Electron build even with the key set", () => {
    expect(isBundleKeyEnvAllowed({ KANSOKU_BUNDLE_KEY: "ab" }, true)).toBe(false);
  });

  it("is allowed in a non-packaged Electron build (dev)", () => {
    expect(isBundleKeyEnvAllowed({ KANSOKU_BUNDLE_KEY: "ab" }, false)).toBe(true);
  });

  it("falls back to NODE_ENV outside Electron (isPackaged unknown/null): blocked in production", () => {
    expect(isBundleKeyEnvAllowed({ NODE_ENV: "production" }, null)).toBe(false);
  });

  it("falls back to NODE_ENV outside Electron: allowed in dev/test", () => {
    expect(isBundleKeyEnvAllowed({ NODE_ENV: "test" }, null)).toBe(true);
    expect(isBundleKeyEnvAllowed({}, null)).toBe(true);
  });
});
