// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from './PageRouter';

vi.mock('./pages/Home', () => ({ Home: () => <div data-testid="home" /> }));
vi.mock('./pages/SymbolCockpit', () => ({
  SymbolCockpit: ({ sym }: { sym: string }) => <div data-testid="symbol-cockpit">{sym}</div>,
}));
vi.mock('./pages/research/ResearchPage', () => ({
  ResearchPage: () => <div data-testid="research-page" />,
}));
vi.mock('./pages/assistant/AssistantChatPage', () => ({
  AssistantChatPage: () => <div data-testid="chat-page" />,
}));
vi.mock('./pages/settings/SettingsPage', () => ({
  SettingsPage: () => <div data-testid="settings-page" />,
}));
vi.mock('./pages/about/AboutPage', () => ({
  AboutPage: () => <div data-testid="about-page" />,
}));
vi.mock('./pages/logViewer/LogsPage', () => ({
  LogsPage: () => <div data-testid="logs-page" />,
}));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('Router symbol routes', () => {
  it('passes the canonical symbol to the cockpit', () => {
    window.history.replaceState({}, '', '/symbol/mu?analysis=latest');

    render(<Router />);

    expect(screen.getByTestId('symbol-cockpit').textContent).toBe('MU.US');
  });

  it('does not crash on a malformed encoded symbol', () => {
    window.history.replaceState({}, '', '/symbol/%ZZ');

    render(<Router />);

    expect(screen.getByTestId('home')).toBeTruthy();
  });
});

describe('Router registry-driven routes', () => {
  it.each([
    ['/', 'home'],
    ['/research', 'research-page'],
    ['/chat', 'chat-page'],
    ['/settings', 'settings-page'],
    ['/about', 'about-page'],
    ['/logs', 'logs-page'],
  ])('resolves %s to the registered page', (pathname, testId) => {
    window.history.replaceState({}, '', pathname);

    render(<Router />);

    expect(screen.getByTestId(testId)).toBeTruthy();
  });

  it('falls back to Home for an unregistered pathname', () => {
    window.history.replaceState({}, '', '/does-not-exist');

    render(<Router />);

    expect(screen.getByTestId('home')).toBeTruthy();
  });
});
