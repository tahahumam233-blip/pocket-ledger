import type { Repositories } from '@/data';
import { todayIsoDate } from '@/domain';

import { buildLedgerExport, type LedgerExportDocument } from './ledger-export';
import type { Clock } from './ports';
import { parseSettings } from './settings';

/** More entries than a personal ledger will ever hold; the export reads them all. */
const EVERY_ENTRY = 1_000_000;

export function createExportService(repos: Repositories, clock?: Clock) {
  return {
    /**
     * Reads the whole ledger and lays it out for reading outside the app:
     * entries, a balanced journal, a trial balance and summaries. Deleted
     * entries and receipt photos are left out.
     */
    async ledgerExport(appName: string): Promise<LedgerExportDocument> {
      const [settingsRecord, accounts, categories, transactions, receiptCounts] = await Promise.all(
        [
          repos.settings.getAll(),
          repos.accounts.list({ includeArchived: true }),
          repos.categories.list({ includeArchived: true }),
          repos.transactions.list({ limit: EVERY_ENTRY }),
          repos.receipts.countsByTransaction(),
        ],
      );
      const settings = parseSettings(settingsRecord);
      return buildLedgerExport({
        appName,
        exportedOn: todayIsoDate(clock?.now() ?? new Date()),
        preparedBy: settings.userName,
        currencies: settings.currencies,
        accounts,
        categories,
        transactions,
        receiptCounts,
      });
    },
  };
}

export type ExportService = ReturnType<typeof createExportService>;
