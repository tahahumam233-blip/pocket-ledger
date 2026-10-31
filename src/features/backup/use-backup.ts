import { useCallback, useState } from 'react';

import { haptics } from '@/platform/haptics';
import { askConfirm } from '@/platform/confirm';
import { pickTextFile } from '@/platform/pick-text-file';
import { shareTextFile } from '@/platform/share-file';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Back up to a file the person keeps (Files, iCloud Drive, AirDrop) and restore from it. */
export function useBackup() {
  const mutate = useLedgerStore((state) => state.mutate);
  const services = useLedgerStore((state) => state.services);
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const backupNow = useCallback(async () => {
    if (!services || busy) return;
    setBusy('backup');
    try {
      const backup = await services.backup.create();
      const saved = await shareTextFile(
        backup.fileName,
        backup.content,
        'application/json',
        'Backup',
      );
      if (!saved) return;
      await mutate((s) => s.backup.markSaved(backup.exportedAt));
      haptics.success();
      const missing = backup.summary.missingFiles
        ? ` ${plural(backup.summary.missingFiles, 'photo')} could not be read.`
        : '';
      showToast(
        `Backup saved with ${plural(backup.summary.transactions, 'entry').replace('entrys', 'entries')} and ${plural(backup.summary.receipts, 'receipt')}.${missing}`,
        { tone: 'success' },
      );
    } catch (caught) {
      haptics.error();
      showToast(caught instanceof Error ? caught.message : 'The backup could not be made.', {
        tone: 'danger',
      });
    } finally {
      setBusy(null);
    }
  }, [busy, mutate, services]);

  const restoreFromFile = useCallback(async () => {
    if (busy) return;
    // The file picker must open straight from the tap, before anything else is awaited.
    const picked = await pickTextFile().catch(() => null);
    if (!picked) return;
    const confirmed = await askConfirm({
      title: 'Restore this backup?',
      message: `${picked.name} will replace every account, entry and receipt currently in Pocket Ledger on this phone.`,
      confirmLabel: 'Restore',
      destructive: true,
    });
    if (!confirmed) return;
    setBusy('restore');
    try {
      const summary = await mutate((s) => s.backup.restore(picked.text));
      haptics.success();
      const missing = summary.missingFiles
        ? ` ${plural(summary.missingFiles, 'photo')} were missing from the file.`
        : '';
      showToast(
        `Restored ${plural(summary.transactions, 'entry').replace('entrys', 'entries')} and ${plural(summary.receipts, 'receipt')}.${missing}`,
        { tone: 'success' },
      );
    } catch (caught) {
      haptics.error();
      showToast(caught instanceof Error ? caught.message : 'That backup could not be restored.', {
        tone: 'danger',
      });
    } finally {
      setBusy(null);
    }
  }, [busy, mutate]);

  return { busy, backupNow, restoreFromFile };
}
