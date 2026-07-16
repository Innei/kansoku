import { useSyncExternalStore } from "react";
import type { ReassessStatus } from "../../packages/core/src/contract/symbols.js";
import { subscribeChannel } from "./wsHub.js";

export interface AnalystRunsSnapshot {
  runs: Map<string, ReassessStatus>;
  unseen: Set<string>;
}

let runs = new Map<string, ReassessStatus>();
let unseen = new Set<string>();
let snapshot: AnalystRunsSnapshot = { runs, unseen };
const listeners = new Set<() => void>();

let activeSymbolProvider: (() => string | null) | null = null;
let unsubscribeChannel: (() => void) | null = null;
let pendingSinceDisconnect = new Set<string>();

function emit(): void {
  snapshot = { runs, unseen };
  for (const listener of listeners) listener();
}

function isReassessStatus(value: unknown): value is ReassessStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return typeof status.running === "boolean";
}

function markUnseenIfInactive(symbol: string): void {
  if (activeSymbolProvider && activeSymbolProvider() !== symbol) {
    unseen = new Set(unseen);
    unseen.add(symbol);
  }
}

function handleInit(payload: { runs?: unknown }): void {
  if (!Array.isArray(payload.runs)) return;
  const next = new Map<string, ReassessStatus>();
  for (const entry of payload.runs) {
    if (!entry || typeof entry !== "object") continue;
    const { symbol, status } = entry as { symbol?: unknown; status?: unknown };
    if (typeof symbol !== "string" || !isReassessStatus(status)) continue;
    next.set(symbol, status);
  }

  const staleCandidates = new Set(runs.keys());
  for (const symbol of pendingSinceDisconnect) staleCandidates.add(symbol);
  for (const symbol of staleCandidates) {
    if (!next.has(symbol)) markUnseenIfInactive(symbol);
  }
  pendingSinceDisconnect = new Set();

  runs = next;
  emit();
}

function handleUpdate(payload: { symbol?: unknown; status?: unknown }): void {
  const { symbol, status } = payload;
  if (typeof symbol !== "string" || !isReassessStatus(status)) return;

  if (status.running) {
    runs = new Map(runs);
    runs.set(symbol, status);
    emit();
    return;
  }

  runs = new Map(runs);
  runs.delete(symbol);
  markUnseenIfInactive(symbol);
  emit();
}

function handleConnected(connected: boolean): void {
  if (connected) return;
  for (const symbol of runs.keys()) pendingSinceDisconnect.add(symbol);
  runs = new Map();
  emit();
}

function onPayload(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const envelope = payload as { type?: unknown };
  if (envelope.type === "init") handleInit(payload as { runs?: unknown });
  else if (envelope.type === "update") handleUpdate(payload as { symbol?: unknown; status?: unknown });
}

export function subscribeAnalystRuns(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    unsubscribeChannel = subscribeChannel({ kind: "analyst-runs" }, onPayload, handleConnected);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeChannel?.();
      unsubscribeChannel = null;
      runs = new Map();
      emit();
    }
  };
}

export function getAnalystRunsSnapshot(): AnalystRunsSnapshot {
  return snapshot;
}

export function isRunning(symbol: string): boolean {
  return runs.has(symbol);
}

export function getRunStatus(symbol: string): ReassessStatus | null {
  return runs.get(symbol) ?? null;
}

export function hasUnseen(symbol: string): boolean {
  return unseen.has(symbol);
}

export function markSeen(symbol: string): void {
  if (!unseen.has(symbol)) return;
  unseen = new Set(unseen);
  unseen.delete(symbol);
  emit();
}

export function setActiveSymbolProvider(fn: (() => string | null) | null): void {
  activeSymbolProvider = fn;
}

export function useAnalystRuns(): AnalystRunsSnapshot {
  return useSyncExternalStore(subscribeAnalystRuns, getAnalystRunsSnapshot);
}

export function resetAnalystRunsStoreForTests(): void {
  runs = new Map();
  unseen = new Set();
  pendingSinceDisconnect = new Set();
  snapshot = { runs, unseen };
  listeners.clear();
  activeSymbolProvider = null;
  unsubscribeChannel?.();
  unsubscribeChannel = null;
}
