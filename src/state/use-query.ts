import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppServices } from '@/application';

import { useLedgerStore } from './ledger-store';

export type QueryState<T> = {
  data: T | null;
  /** True until the first result (or error) arrives; later reloads keep showing the old data. */
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Runs a read against the services and re-runs it whenever the ledger version
 * changes (after any write) or the dependency list changes.
 */
export function useQuery<T>(
  query: (services: AppServices) => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> {
  const services = useLedgerStore((state) => state.services);
  const version = useLedgerStore((state) => state.version);
  const [result, setResult] = useState<{ data: T | null; error: string | null; settled: boolean }>({
    data: null,
    error: null,
    settled: false,
  });
  const latest = useRef(0);
  const depsKey = deps.map((value) => `${typeof value}:${String(value)}`).join('\u0000');

  const run = useCallback(async () => {
    if (!services) return;
    const ticket = (latest.current += 1);
    try {
      const data = await query(services);
      if (ticket === latest.current) setResult({ data, error: null, settled: true });
    } catch (caught) {
      if (ticket === latest.current) {
        setResult((current) => ({
          data: current.data,
          error: caught instanceof Error ? caught.message : String(caught),
          settled: true,
        }));
      }
    }
    // The query function is recreated by callers each render; depsKey captures what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, version, depsKey]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data: result.data, loading: !result.settled, error: result.error, reload: run };
}
