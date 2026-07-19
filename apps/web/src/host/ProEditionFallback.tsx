import { useEffect, useRef, useState } from 'react';
import { Home } from '../pages/Home';
import { bootstrapWebEditionHost } from './bootstrapWebEditionHost';

export interface ProEditionFallbackDeps {
  bootstrap?: typeof bootstrapWebEditionHost;
}

// Community/OSS routing has no compile-time knowledge of any pro page path
// (that path string must never appear in the community bundle — see design
// §18 Phase 8 acceptance (a)). Any pathname the static RouteRegistry doesn't
// resolve is therefore a candidate: try mounting the encrypted web edition
// entry into a container; if the bundle is absent/locked/incompatible or the
// loaded edition has nothing for this pathname, bootstrapWebEditionHost
// resolves null and this falls back to Home exactly like the pre-wiring
// behavior did.
export function ProEditionFallback({ deps = {} }: { deps?: ProEditionFallbackDeps } = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    const bootstrap = deps.bootstrap ?? bootstrapWebEditionHost;

    bootstrap(container)
      .then((dispose) => {
        if (cancelled) {
          dispose?.();
          return;
        }
        cleanup = dispose;
        setMounted(dispose !== null);
      })
      .catch((error: unknown) => {
        console.info('[web-edition] fallback mount failed, showing community page', error);
        if (!cancelled) setMounted(false);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [deps.bootstrap]);

  return (
    <>
      <div ref={containerRef} />
      {mounted ? null : <Home />}
    </>
  );
}
