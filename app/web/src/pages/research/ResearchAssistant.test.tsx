// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchDocument } from "../../../../packages/core/src/contract";

let capabilities: { pro: boolean | null; licensed: boolean } = { pro: true, licensed: true };

vi.mock("../../capabilitiesStore", () => ({
  useCapabilities: () => capabilities,
}));
vi.mock("../../apiHooks", () => ({
  useQuery: () => ({ data: [], error: null, loading: false, reload: vi.fn(), failure: null, dataUpdatedAt: null, refreshed: false }),
}));
vi.mock("../../client", () => ({
  client: {
    research: {
      listEdits: vi.fn().mockResolvedValue([]),
      getRefresh: vi.fn().mockResolvedValue(null),
    },
  },
}));
vi.mock("../../wsHub", () => ({
  subscribeChannel: () => () => {},
}));
vi.mock("../cockpit/chat/useChatSession", () => ({
  useResearchChatSession: () => ({
    rows: [],
    busy: false,
    aborting: false,
    streamText: "",
    liveTools: [],
    suggestions: [],
    hint: undefined,
    loaded: true,
    session: null,
    ensureSuggestions: vi.fn(),
    send: vi.fn().mockResolvedValue({ ok: true }),
    abort: vi.fn(),
  }),
}));
vi.mock("../cockpit/chat/ChatComposer", () => ({
  ChatComposer: () => <div data-testid="chat-composer" />,
}));
vi.mock("../cockpit/chat/ConversationTranscript", () => ({
  ConversationTranscript: () => <div data-testid="conversation-transcript" />,
}));

const { ResearchAssistant } = await import("./ResearchAssistant");

const document: ResearchDocument = {
  path: "stocks/MRVL.md",
  kind: "stock",
  type: "stock",
  title: "MRVL",
  date: null,
  symbols: ["MRVL"],
  mtime: "2026-07-18T00:00:00.000Z",
  excerpt: "",
  markdown: "# MRVL",
  revision: "r1",
};

afterEach(() => {
  cleanup();
  capabilities = { pro: true, licensed: true };
});

describe("ResearchAssistant license gate", () => {
  it("renders the locked placeholder instead of the AI panel when pro but unlicensed", () => {
    capabilities = { pro: true, licensed: false };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={[]}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/研究库 AI/)).toBeTruthy();
    expect(screen.getByText("订阅解锁")).toBeTruthy();
    expect(screen.queryByLabelText("刷新研究")).toBeNull();
    expect(screen.queryByTestId("chat-composer")).toBeNull();
  });

  it("renders the real AI panel when pro and licensed", () => {
    capabilities = { pro: true, licensed: true };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={[]}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("刷新研究")).toBeTruthy();
    expect(screen.getByTestId("chat-composer")).toBeTruthy();
    expect(screen.queryByText(/研究库 AI/)).toBeNull();
  });
});
