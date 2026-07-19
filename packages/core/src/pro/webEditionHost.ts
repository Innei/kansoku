export const WEB_EDITION_ABI_VERSION = 1;

export interface WebEditionHost {
  abiVersion: number;
  react: unknown;
  reactJsxRuntime: unknown;
  registerRoute(path: string, loadPage: () => Promise<{ default: unknown }>): void;
}

export interface WebEditionEntryModule {
  abiVersion: number;
  runtime: "web";
  createEdition(host: WebEditionHost): { mount(container: Element): () => void };
}

export function isValidWebEditionEntry(mod: unknown): mod is WebEditionEntryModule {
  if (mod === null || typeof mod !== "object") return false;
  const candidate = mod as Partial<WebEditionEntryModule>;
  return (
    candidate.abiVersion === WEB_EDITION_ABI_VERSION &&
    candidate.runtime === "web" &&
    typeof candidate.createEdition === "function"
  );
}
