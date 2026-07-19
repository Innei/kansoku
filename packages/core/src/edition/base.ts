import type { CoreEditionHost, DesktopEditionHost, ServerEditionHost } from './host.js';

export abstract class BaseEdition<THost extends CoreEditionHost> {
  private initialized = false;
  private started = false;
  private disposed = false;

  constructor(protected readonly host: THost) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error(`${this.constructor.name}: already initialized`);
    }
    await this.onInitialize();
    this.initialized = true;
  }

  async start(): Promise<void> {
    if (this.disposed) {
      throw new Error(`${this.constructor.name}: cannot start after dispose`);
    }
    if (!this.initialized) {
      throw new Error(`${this.constructor.name}: must initialize before start`);
    }
    if (this.started) return;
    await this.onStart();
    this.started = true;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.onDispose();
  }

  protected onInitialize(): Promise<void> | void {}
  protected onStart(): Promise<void> | void {}
  protected onDispose(): Promise<void> | void {}
}

export abstract class BaseServerEdition extends BaseEdition<ServerEditionHost> {}
export abstract class BaseDesktopEdition extends BaseEdition<DesktopEditionHost> {}
