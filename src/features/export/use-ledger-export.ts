import { useCallback, useState } from 'react';

import { XLSX_MIME_TYPE } from '@/application/file-formats';
import { buildLedgerCsv, buildLedgerXlsx } from '@/application/ledger-export';
import brand from '@/config/brand.json';
import { lightColors } from '@/design';
import { haptics } from '@/platform/haptics';
import { shareFile } from '@/platform/share-file';
import { useServices } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';

export type LedgerExportFormat = 'xlsx' | 'csv';

/**
 * Exports the whole ledger as one file: an Excel workbook with a sheet per view,
 * or the journal as a CSV table. Built on the phone and handed to the share sheet.
 */
export function useLedgerExport(onShared?: () => void) {
  const services = useServices();
  const [busy, setBusy] = useState<LedgerExportFormat | null>(null);

  const exportAs = useCallback(
    async (format: LedgerExportFormat) => {
      if (busy) return;
      setBusy(format);
      try {
        const document = await services.exporter.ledgerExport(brand.name);
        const shared =
          format === 'xlsx'
            ? await shareFile(
                `${document.fileBaseName}.xlsx`,
                // Files are read on white paper, so they always use the light palette.
                buildLedgerXlsx(document, lightColors),
                XLSX_MIME_TYPE,
                'Ledger export',
              )
            : await shareFile(
                `${document.fileBaseName}.csv`,
                buildLedgerCsv(document),
                'text/csv',
                'Ledger export',
              );
        if (shared) {
          const entries = document.entries.length;
          haptics.success();
          showToast(`Exported ${entries} ${entries === 1 ? 'entry' : 'entries'}.`, {
            tone: 'success',
          });
          onShared?.();
        }
      } catch (caught) {
        haptics.error();
        showToast(caught instanceof Error ? caught.message : 'Export failed.', { tone: 'danger' });
      } finally {
        setBusy(null);
      }
    },
    [busy, services, onShared],
  );

  return { busy, exportAs };
}
