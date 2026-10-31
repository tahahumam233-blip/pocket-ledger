import { create } from 'zustand';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & { id: number; resolve: (confirmed: boolean) => void };

type ConfirmState = {
  current: ConfirmRequest | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  settle: (confirmed: boolean) => void;
};

let nextId = 1;

/** Backs the in-app confirmation dialog used where native alerts are unavailable (the web app). */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().current?.resolve(false);
      set({ current: { ...options, id: nextId++, resolve } });
    }),
  settle: (confirmed) => {
    const current = get().current;
    if (!current) return;
    set({ current: null });
    current.resolve(confirmed);
  },
}));
