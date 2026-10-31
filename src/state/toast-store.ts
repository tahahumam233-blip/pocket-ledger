import { create } from 'zustand';

export type Toast = {
  id: number;
  message: string;
  tone: 'neutral' | 'success' | 'danger';
  action?: { label: string; onPress: () => void | Promise<void> };
  durationMs: number;
};

type ToastState = {
  current: Toast | null;
  show: (toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => void;
  dismiss: (id?: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: (toast) => {
    const id = nextId++;
    set({
      current: { ...toast, id, durationMs: toast.durationMs ?? (toast.action ? 6000 : 3200) },
    });
  },
  dismiss: (id) => {
    const current = get().current;
    if (!current) return;
    if (id === undefined || current.id === id) set({ current: null });
  },
}));

export function showToast(message: string, options: Partial<Omit<Toast, 'id' | 'message'>> = {}) {
  useToastStore.getState().show({ message, tone: options.tone ?? 'neutral', ...options });
}
