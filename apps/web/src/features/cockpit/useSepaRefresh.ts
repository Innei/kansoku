import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChartDocView } from '@web/features/charts/intraday/useIntradayDoc';
import { errorMessage } from '@web/lib/api';
import { client } from '@web/lib/client';

export interface SepaRefreshController {
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSepaRefresh(
  doc: ChartDocView | null,
  reload: () => void,
): SepaRefreshController {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriedRef = useRef<Set<string>>(new Set());

  const docId = doc?.id ?? null;
  const isResearchOrigin = doc?.input.origin === 'research';
  const stale = doc?.sepa_stale === true;

  useEffect(() => {
    setError(null);
  }, [docId]);

  const refresh = useCallback(async () => {
    if (!docId) return;
    setRefreshing(true);
    setError(null);
    try {
      await client.charts.update({ id: docId, refresh: true });
      reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRefreshing(false);
    }
  }, [docId, reload]);

  useEffect(() => {
    if (!docId || !isResearchOrigin || !stale) return;
    if (autoTriedRef.current.has(docId)) return;
    autoTriedRef.current.add(docId);
    void refresh();
  }, [docId, isResearchOrigin, stale, refresh]);

  return { refreshing, error, refresh };
}
