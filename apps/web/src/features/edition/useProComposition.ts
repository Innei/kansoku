import { useEffect, useState } from 'react';
import type { WebProComposition } from './types';

let cached: Promise<WebProComposition | null> | null = null;

// This import must stay dynamic: a static edge here would pull the pro chunk
// into the public bundle, defeating the __pro__ encryption boundary.
function resolveProComposition(): Promise<WebProComposition | null> {
  cached ??= import('./pro')
    .then((m) => m.loadProComposition())
    .catch(() => null);
  return cached;
}

export type ProCompositionState =
  | { status: 'loading'; composition: null }
  | { status: 'ready'; composition: WebProComposition | null };

export function useProComposition(): ProCompositionState {
  const [state, setState] = useState<ProCompositionState>({ status: 'loading', composition: null });

  useEffect(() => {
    let active = true;
    void resolveProComposition().then((resolved) => {
      if (active) setState({ status: 'ready', composition: resolved });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function resetProCompositionForTests(): void {
  cached = null;
}
