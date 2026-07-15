// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTabsController, type TabsController } from "./tabsController";
import { loadTabsSnapshot, saveTabsSnapshot, type TabsSnapshot } from "./tabsStore";
import type { TabState, TabsMutateOp, TabsSnapshot as BridgeSnapshot } from "./desktopTabsBridge";

function makeTab(route: string, id = route): TabState {
  return { id, route, title: "Kansoku", scrollY: 0 };
}

class FakeBridge {
  revision = 0;
  tabs: TabState[] = [];
  listeners = new Set<(snapshot: BridgeSnapshot) => void>();
  mutateCalls: TabsMutateOp[] = [];

  seed(tabs: TabState[]) {
    this.tabs = tabs;
    this.revision = 1;
  }

  async getSnapshot(): Promise<BridgeSnapshot> {
    return { revision: this.revision, tabs: this.tabs };
  }

  async mutate(op: TabsMutateOp): Promise<BridgeSnapshot> {
    this.mutateCalls.push(op);
    this.tabs = applyOp(this.tabs, op);
    this.revision += 1;
    const snapshot = { revision: this.revision, tabs: this.tabs };
    for (const listener of this.listeners) listener(snapshot);
    return snapshot;
  }

  onSnapshot(cb: (snapshot: BridgeSnapshot) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  broadcastExternalClose(id: string) {
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
    this.revision += 1;
    const snapshot = { revision: this.revision, tabs: this.tabs };
    for (const listener of this.listeners) listener(snapshot);
  }

  onCommand(): () => void {
    return () => {};
  }
}

function applyOp(tabs: TabState[], op: TabsMutateOp): TabState[] {
  switch (op.op) {
    case "open":
      return [...tabs, makeTab(op.route, `new-${tabs.length}`)];
    case "close":
      return tabs.filter((tab) => tab.id !== op.id);
    case "adopt":
      return tabs.length > 0 ? tabs : op.tabs;
    default:
      return tabs;
  }
}

function Probe({ onReady }: { onReady: (controller: TabsController) => void }) {
  const controller = useTabsController();
  onReady(controller);
  return null;
}

function renderController() {
  let latest!: TabsController;
  render(<Probe onReady={(controller) => (latest = controller)} />);
  return () => latest;
}

describe("useTabsController with shared bridge", () => {
  let bridge: FakeBridge;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    bridge = new FakeBridge();
    (window as unknown as { desktop: unknown }).desktop = { tabs: bridge };
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  it("renders tabs driven by the main-process broadcast", async () => {
    bridge.seed([makeTab("/"), makeTab("/settings")]);
    const getController = renderController();

    await waitFor(() => {
      expect(getController().snapshot.tabs.map((t) => t.route)).toEqual(["/", "/settings"]);
    });
  });

  it("submits a mutate call instead of mutating locally", async () => {
    bridge.seed([makeTab("/")]);
    const getController = renderController();
    await waitFor(() => expect(getController().snapshot.tabs).toHaveLength(1));

    act(() => getController().openTab("/symbol/NVDA"));

    await waitFor(() => {
      expect(bridge.mutateCalls.some((op) => op.op === "open" && op.route === "/symbol/NVDA")).toBe(true);
      expect(getController().snapshot.tabs.some((t) => t.route === "/symbol/NVDA")).toBe(true);
    });
  });

  it("reselects the active tab when an external broadcast removes it", async () => {
    bridge.seed([makeTab("/", "a"), makeTab("/settings", "b"), makeTab("/logs", "c")]);
    const getController = renderController();
    await waitFor(() => expect(getController().snapshot.tabs).toHaveLength(3));

    act(() => getController().activateTab("b"));
    await waitFor(() => expect(getController().snapshot.activeTabId).toBe("b"));

    act(() => bridge.broadcastExternalClose("b"));

    await waitFor(() => {
      expect(getController().snapshot.tabs.some((t) => t.id === "b")).toBe(false);
      expect(getController().snapshot.activeTabId).toBe("c");
    });
  });

  it("migrates legacy localStorage tabs into the shared store exactly once", async () => {
    const legacy: TabsSnapshot = {
      tabs: [makeTab("/", "legacy-a"), makeTab("/symbol/MU", "legacy-b")],
      activeTabId: "legacy-b",
    };
    saveTabsSnapshot(legacy);

    const getController = renderController();

    await waitFor(() => {
      expect(getController().snapshot.tabs.map((t) => t.id)).toEqual(["legacy-a", "legacy-b"]);
    });
    const adoptCalls = bridge.mutateCalls.filter((op) => op.op === "adopt");
    expect(adoptCalls).toHaveLength(1);
  });

  it("opens a fresh home tab through adopt when the store is empty and there is no legacy snapshot", async () => {
    const getController = renderController();

    await waitFor(() => {
      expect(getController().snapshot.tabs).toHaveLength(1);
      expect(getController().snapshot.tabs[0].route).toBe("/");
    });
    const adoptCalls = bridge.mutateCalls.filter((op) => op.op === "adopt");
    expect(adoptCalls).toHaveLength(1);
  });
});

describe("useTabsController without a shared bridge (web / old preload)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  afterEach(() => {
    cleanup();
  });

  it("falls back to localStorage-backed state unchanged", async () => {
    const getController = renderController();
    await act(async () => {});

    expect(getController().snapshot.tabs).toHaveLength(1);
    expect(getController().snapshot.tabs[0].route).toBe("/");

    act(() => getController().openTab("/symbol/NVDA"));
    await act(async () => {});

    expect(loadTabsSnapshot().tabs.some((t) => t.route === "/symbol/NVDA")).toBe(true);
  });
});
