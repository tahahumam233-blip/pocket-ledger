import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { createAppServices } from '@/application';
import { openAppDatabase } from '@/data/open-database';
import { receiptFiles } from '@/platform/receipt-files';

import { useLedgerStore } from './ledger-store';

type BootStatus =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export type AppBootState = BootStatus & { retry: () => void };

/** Opens the database once and binds the services into the shared store. */
export function useAppBoot(): AppBootState {
  const [state, setState] = useState<BootStatus>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repos = await openAppDatabase();
        const services = createAppServices({ repos, files: receiptFiles });
        await services.setup.seedCategoriesIfEmpty();
        await useLedgerStore.getState().bind(services);
        if (!cancelled) setState({ status: 'ready' });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'The ledger could not be opened.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, retry };
}

export function AppReadyGate({
  children,
  fallback,
}: PropsWithChildren<{ fallback: React.ReactNode }>) {
  const services = useLedgerStore((state) => state.services);
  const snapshot = useLedgerStore((state) => state.snapshot);
  if (!services || !snapshot) return <>{fallback}</>;
  return <>{children}</>;
}
