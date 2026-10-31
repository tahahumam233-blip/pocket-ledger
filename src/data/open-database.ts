import { openDatabaseAsync } from 'expo-sqlite';

import { initializeDatabase, type Repositories } from './database';
import { createExpoSqliteDriver } from './drivers/expo-sqlite-driver';

export const DATABASE_NAME = 'pocket-ledger.db';

/** Opens the on-device database, enabling WAL for durability and read concurrency. */
export async function openAppDatabase(): Promise<Repositories> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    await db.execAsync('PRAGMA journal_mode = WAL');
  } catch {
    // WAL is an optimisation; the default journal mode is still safe.
  }
  const driver = createExpoSqliteDriver(db);
  return initializeDatabase(driver);
}
