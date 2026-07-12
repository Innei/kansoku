import { describe, expect, it } from "vitest";
import { computeGateStatus } from "./gateStatus";

describe("computeGateStatus", () => {
  it("is ready immediately in a plain browser (no desktop bridge), regardless of everything else", () => {
    expect(
      computeGateStatus({ hasDesktopBridge: false, statusLoading: true, configured: false }),
    ).toBe("ready");
  });

  it("is loading while the desktop status request is in flight", () => {
    expect(
      computeGateStatus({ hasDesktopBridge: true, statusLoading: true, configured: null }),
    ).toBe("loading");
  });

  it("is ready when desktop and status reports configured:true (e.g. OAuth-only machine)", () => {
    expect(
      computeGateStatus({ hasDesktopBridge: true, statusLoading: false, configured: true }),
    ).toBe("ready");
  });

  it("fails open to ready when the status request itself failed (configured unknown)", () => {
    expect(
      computeGateStatus({ hasDesktopBridge: true, statusLoading: false, configured: null }),
    ).toBe("ready");
  });

  it("is onboarding when desktop and the CLI is not ready", () => {
    expect(
      computeGateStatus({ hasDesktopBridge: true, statusLoading: false, configured: false }),
    ).toBe("onboarding");
  });
});
