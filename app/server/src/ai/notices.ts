import type { Notice } from "../../../shared/types.js";

type Listener = (notice: Notice) => void;

const listeners = new Map<string, Set<Listener>>();

function key(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  return normalized.includes(".") ? normalized : `${normalized}.US`;
}

export function onNotice(symbol: string, listener: Listener): () => void {
  const k = key(symbol);
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(listener);
  return () => {
    const current = listeners.get(k);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(k);
  };
}

export function emitNotice(notice: Notice): void {
  const k = key(notice.symbol);
  const normalized: Notice = { ...notice, symbol: k };
  const set = listeners.get(k);
  if (!set) return;
  for (const listener of [...set]) {
    try {
      listener(normalized);
    } catch {
      continue;
    }
  }
}
