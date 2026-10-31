import { createAccountsRepository } from './repositories/accounts-repository';
import { createCategoriesRepository } from './repositories/categories-repository';
import { createReceiptsRepository } from './repositories/receipts-repository';
import { createReportsRepository } from './repositories/reports-repository';
import { createSettingsRepository } from './repositories/settings-repository';
import { createTransactionsRepository } from './repositories/transactions-repository';
import { migrate } from './schema';
import type { SqlDriver } from './sql';

export type Repositories = {
  driver: SqlDriver;
  settings: ReturnType<typeof createSettingsRepository>;
  accounts: ReturnType<typeof createAccountsRepository>;
  categories: ReturnType<typeof createCategoriesRepository>;
  transactions: ReturnType<typeof createTransactionsRepository>;
  receipts: ReturnType<typeof createReceiptsRepository>;
  reports: ReturnType<typeof createReportsRepository>;
};

export function createRepositories(driver: SqlDriver): Repositories {
  return {
    driver,
    settings: createSettingsRepository(driver),
    accounts: createAccountsRepository(driver),
    categories: createCategoriesRepository(driver),
    transactions: createTransactionsRepository(driver),
    receipts: createReceiptsRepository(driver),
    reports: createReportsRepository(driver),
  };
}

/** Prepares any driver for use: pragmas plus pending migrations. */
export async function initializeDatabase(driver: SqlDriver): Promise<Repositories> {
  await driver.exec('PRAGMA foreign_keys = ON');
  await migrate(driver);
  return createRepositories(driver);
}
