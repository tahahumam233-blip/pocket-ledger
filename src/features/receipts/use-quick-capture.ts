import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { haptics } from '@/platform/haptics';
import { captureFromCamera, pickFromLibrary } from '@/platform/image-capture';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

/** Snap or pick a receipt, save it to the inbox, and offer to add the amount right away. */
export function useQuickCapture() {
  const router = useRouter();
  const mutate = useLedgerStore((state) => state.mutate);
  const [busy, setBusy] = useState(false);

  const save = useCallback(
    async (source: 'camera' | 'library') => {
      if (busy) return;
      setBusy(true);
      try {
        const image = source === 'camera' ? await captureFromCamera() : await pickFromLibrary();
        if (!image) return;
        const receipt = await mutate((services) => services.receipts.capture(image));
        haptics.success();
        showToast('Receipt saved to your inbox.', {
          tone: 'success',
          action: {
            label: 'Add amount',
            onPress: () =>
              router.push({
                pathname: '/transaction/new',
                params: { kind: 'expense', receiptId: receipt.id },
              }),
          },
        });
      } catch (error) {
        haptics.error();
        showToast(error instanceof Error ? error.message : 'The receipt could not be saved.', {
          tone: 'danger',
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, mutate, router],
  );

  return {
    busy,
    snap: () => save('camera'),
    pick: () => save('library'),
  };
}
