import type { MutableModels } from "@earendil-works/pi-ai";
import type { AppCredentialStore } from "../../ai/credentialStore.js";
import { getAiRuntime } from "../../ai/initAiSettings.js";
import { getModelsRuntime } from "../../ai/modelsRuntime.js";
import type { SecretBox } from "../../ai/secretBox.js";
import { getActiveSettingsStore, type SettingsStore } from "../../ai/settingsStore.js";
import { getDb, type Db } from "../../db/index.js";

const DEFAULT_TEST_TIMEOUT_MS = 25_000;

export interface SettingsDeps {
  settingsStore: SettingsStore;
  credentials: AppCredentialStore;
  secretBox: SecretBox;
  models: MutableModels;
  testTimeoutMs: number;
  db: Db;
}

let testDeps: Partial<SettingsDeps> | null = null;

export function setSettingsDepsForTests(overrides: Partial<SettingsDeps> | null): void {
  testDeps = overrides;
}

export function settingsDeps(): SettingsDeps {
  return {
    settingsStore: testDeps?.settingsStore ?? getActiveSettingsStore(),
    credentials: testDeps?.credentials ?? getAiRuntime().credentials,
    secretBox: testDeps?.secretBox ?? getAiRuntime().secretBox,
    models: testDeps?.models ?? getModelsRuntime(),
    testTimeoutMs: testDeps?.testTimeoutMs ?? DEFAULT_TEST_TIMEOUT_MS,
    db: testDeps?.db ?? getDb(),
  };
}
