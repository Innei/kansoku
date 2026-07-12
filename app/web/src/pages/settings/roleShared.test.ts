import { describe, expect, it } from "vitest";
import { defaultCustom, defaultThinkingLevel } from "./roleShared";
import type { Catalog } from "./types";

const catalog: Catalog = {
  providers: [
    {
      id: "lobehub",
      name: "LobeHub Cloud",
      auth: { kind: "oauth", status: "configured" },
      models: [
        { id: "reasoning-only", name: "Reasoning Only", thinkingLevels: ["minimal", "low", "high"] },
        { id: "regular", name: "Regular", thinkingLevels: ["off"] },
      ],
    },
  ],
};

describe("roleShared model defaults", () => {
  it("uses the selected model's first supported thinking level instead of assuming off", () => {
    expect(defaultThinkingLevel(catalog, "lobehub", "reasoning-only")).toBe("minimal");
    expect(defaultThinkingLevel(catalog, "lobehub", "regular")).toBe("off");
    expect(defaultCustom(catalog)).toMatchObject({
      provider: "lobehub",
      modelId: "reasoning-only",
      thinkingLevel: "minimal",
    });
  });
});
