declare module 'jsdom' {
  export interface JSDOMOptions {
    runScripts?: 'outside-only' | 'dangerously';
    pretendToBeVisual?: boolean;
  }
  export class JSDOM {
    constructor(html?: string, options?: JSDOMOptions);
    readonly window: Window & typeof globalThis;
  }
}
