import type { ComponentType } from 'react';
import { AboutPage } from '../pages/about/AboutPage';
import { AssistantChatPage } from '../pages/assistant/AssistantChatPage';
import { Home } from '../pages/Home';
import { LogsPage } from '../pages/logViewer/LogsPage';
import { ResearchPage } from '../pages/research/ResearchPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

export interface RouteEntry {
  path: string;
  Component: ComponentType;
}

export class RouteRegistry {
  private readonly routes = new Map<string, ComponentType>();

  add(path: string, Component: ComponentType): void {
    this.routes.set(path, Component);
  }

  addPublicRoutes(): void {
    this.add('/', Home);
    this.add('/research', ResearchPage);
    this.add('/chat', AssistantChatPage);
    this.add('/settings', SettingsPage);
    this.add('/about', AboutPage);
    this.add('/logs', LogsPage);
  }

  get(path: string): ComponentType | undefined {
    return this.routes.get(path);
  }

  list(): RouteEntry[] {
    return Array.from(this.routes, ([path, Component]) => ({ path, Component }));
  }
}
