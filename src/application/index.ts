import type { Repositories } from '@/data';

import { createExportService } from './export-service';
import { createLedgerService } from './ledger-service';
import type { Clock, IdGenerator, ReceiptFileStore } from './ports';
import { createQueries } from './queries';
import { createReceiptService } from './receipt-service';
import { createSetupService } from './setup-service';

export * from './export-service';
export * from './ledger-service';
export * from './ports';
export * from './queries';
export * from './receipt-service';
export * from './reminder';
export * from './settings';
export * from './setup-service';

export type AppServices = {
  repos: Repositories;
  ledger: ReturnType<typeof createLedgerService>;
  receipts: ReturnType<typeof createReceiptService>;
  setup: ReturnType<typeof createSetupService>;
  queries: ReturnType<typeof createQueries>;
  exporter: ReturnType<typeof createExportService>;
};

export function createAppServices(deps: {
  repos: Repositories;
  files: ReceiptFileStore;
  clock?: Clock;
  newId?: IdGenerator;
}): AppServices {
  const { repos, files, clock, newId } = deps;
  const ledger = createLedgerService({ repos, clock, newId });
  return {
    repos,
    ledger,
    receipts: createReceiptService({ repos, ledger, files, clock, newId }),
    setup: createSetupService({ repos, ledger, clock, newId }),
    queries: createQueries(repos, clock),
    exporter: createExportService(repos, clock),
  };
}
