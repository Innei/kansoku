import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { loadProComposition } from './pro';

let cached: Promise<Record<string, ComponentType> | null> | null = null;

function resolveProRoutes(): Promise<Record<string, ComponentType> | null> {
  cached ??= loadProComposition()
    .then((composition) => (composition ? { ...composition.routes } : null))
    .catch(() => null);
  return cached;
}

export function useProRoutes(): Record<string, ComponentType> | null {
  const [routes, setRoutes] = useState<Record<string, ComponentType> | null>(null);

  useEffect(() => {
    let active = true;
    void resolveProRoutes().then((resolved) => {
      if (active) setRoutes(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return routes;
}

export function resetProRoutesForTests(): void {
  cached = null;
}
