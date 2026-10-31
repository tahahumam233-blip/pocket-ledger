import type { Repositories } from '@/data';
import { buildTransactionsCsv, todayIsoDate } from '@/domain';

import type { Clock } from './ports';

export function createExportService(repos: Repositories, clock?: Clock) {
  return {
    /** Builds the CSV text and a suggested file name for sharing. */
    async transactionsCsv(): Promise<{ fileName: string; content: string; rows: number }> {
      const rows = await repos.reports.csvRows();
      const date = todayIsoDate(clock?.now() ?? new Date());
      return {
        fileName: `pocket-ledger-${date}.csv`,
        content: buildTransactionsCsv(rows),
        rows: rows.length,
      };
    },
  };
}

export type ExportService = ReturnType<typeof createExportService>;
