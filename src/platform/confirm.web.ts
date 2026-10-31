import { type ConfirmOptions, useConfirmStore } from '@/state/confirm-store';

/** Web version: shows the in-app confirmation dialog rendered by ConfirmHost. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open(options);
}
