import { create } from 'zustand';

import type { AppServices } from '@/application';
import type { HomeSnapshot } from '@/application/queries';
import { type AppSettings, DEFAULT_SETTINGS } from '@/application/settings';

type LedgerState = {
  services: AppServices | null;
  snapshot: HomeSnapshot | null;
  settings: AppSettings;
  /** Increments after every successful write so screens can reload their own queries. */
  version: number;
  loading: boolean;
  error: string | null;
  bind: (services: AppServices) => Promise<void>;
  refresh: () => Promise<void>;
  /** Runs a write, then refreshes shared state. Errors propagate to the caller. */
  mutate: <T>(work: (services: AppServices) => Promise<T>) => Promise<T>;
};

export const useLedgerStore = create<LedgerState>((set, get) => ({
  services: null,
  snapshot: null,
  settings: DEFAULT_SETTINGS,
  version: 0,
  loading: false,
  error: null,
  bind: async (services) => {
    set({ services });
    await get().refresh();
  },
  refresh: async () => {
    const { services } = get();
    if (!services) return;
    set({ loading: true });
    try {
      const snapshot = await services.queries.home();
      set((state) => ({
        snapshot,
        settings: snapshot.settings,
        loading: false,
        error: null,
        version: state.version + 1,
      }));
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  mutate: async (work) => {
    const { services } = get();
    if (!services) throw new Error('The ledger is still loading.');
    const result = await work(services);
    await get().refresh();
    return result;
  },
}));

export function useServices(): AppServices {
  const services = useLedgerStore((state) => state.services);
  if (!services) throw new Error('Services are not ready yet.');
  return services;
}

export function useSettings(): AppSettings {
  return useLedgerStore((state) => state.settings);
}

export function useSnapshot(): HomeSnapshot | null {
  return useLedgerStore((state) => state.snapshot);
}
