// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResearchDocument, ResearchDocumentMeta } from '@kansoku/core/contract/index';
import type { ProCompositionState } from '@web/features/edition/useProComposition';
import type { ResearchAssistantProps } from './ResearchAssistant';

let capabilities: { features?: Record<string, string> } = { features: { 'research-ai': 'locked' } };
let proComposition: ProCompositionState = { status: 'loading', composition: null };

vi.mock('@web/features/edition/capabilitiesStore', () => ({
  useCapabilities: () => capabilities,
}));
vi.mock('@web/features/edition/useProComposition', () => ({
  useProComposition: () => proComposition,
}));

const { ResearchAssistant } = await import('./ResearchAssistant');

const document: ResearchDocument = {
  path: 'stocks/MRVL.md',
  kind: 'stock',
  type: 'stock',
  title: 'MRVL',
  date: null,
  symbols: ['MRVL'],
  mtime: '2026-07-18T00:00:00.000Z',
  excerpt: '',
  markdown: '# MRVL',
  revision: 'r1',
};

const related: ResearchDocumentMeta[] = [
  {
    path: 'stocks/AVGO.md',
    kind: 'stock',
    type: 'stock',
    title: 'AVGO',
    date: null,
    symbols: ['AVGO'],
    mtime: '2026-07-18T00:00:00.000Z',
    excerpt: '',
  },
];

afterEach(() => {
  cleanup();
  capabilities = { features: { 'research-ai': 'locked' } };
  proComposition = { status: 'loading', composition: null };
});

describe('ResearchAssistant free stub', () => {
  it('renders the locked placeholder + browse card when research-ai is locked', () => {
    capabilities = { features: { 'research-ai': 'locked' } };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={related}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/研究库 AI/)).toBeTruthy();
    expect(screen.getByText('订阅解锁')).toBeTruthy();
    expect(screen.getByText(/关联资料/)).toBeTruthy();
  });

  it('renders the browse card only for a community build (pro:false), no locked notice', () => {
    capabilities = { features: { 'research-ai': 'absent' } };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={related}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/关联资料/)).toBeTruthy();
    expect(screen.queryByText(/研究库 AI/)).toBeNull();
    expect(screen.queryByText('订阅解锁')).toBeNull();
  });
});

describe('ResearchAssistant available branch', () => {
  it('degrades to the related-materials card while the composition is loading', () => {
    capabilities = { features: { 'research-ai': 'active' } };
    proComposition = { status: 'loading', composition: null };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={related}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/关联资料/)).toBeTruthy();
    expect(screen.queryByText(/研究库 AI/)).toBeNull();
  });

  it('degrades to the related-materials card when the composition resolves to null', () => {
    capabilities = { features: { 'research-ai': 'active' } };
    proComposition = { status: 'ready', composition: null };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={related}
        onSelect={vi.fn()}
        onDocumentChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/关联资料/)).toBeTruthy();
  });

  it('mounts the pro panel with the props passed through once the composition supplies it', () => {
    capabilities = { features: { 'research-ai': 'active' } };
    const onSelect = vi.fn();
    const onDocumentChanged = vi.fn();
    let received: ResearchAssistantProps | null = null;
    function MockPanel(props: ResearchAssistantProps) {
      received = props;
      return <div data-testid="pro-panel">{props.document.title}</div>;
    }
    proComposition = { status: 'ready', composition: { researchAssistantPanel: MockPanel } };

    render(
      <ResearchAssistant
        document={document}
        selected={document}
        related={related}
        onSelect={onSelect}
        onDocumentChanged={onDocumentChanged}
      />,
    );

    expect(screen.getByTestId('pro-panel').textContent).toBe('MRVL');
    expect(screen.queryByText(/关联资料/)).toBeNull();
    expect(received).toEqual({
      document,
      selected: document,
      related,
      onSelect,
      onDocumentChanged,
    });
  });
});
