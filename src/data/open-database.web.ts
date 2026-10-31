import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';

import { webAssetUrl } from '@/platform/web-base';

import { initializeDatabase, type Repositories } from './database';
import { createSqlJsDriver } from './drivers/sqljs-driver';
import { createIndexedDbSnapshotStore } from './web-snapshot-store';

export const DATABASE_NAME = 'pocket-ledger.db';

/**
 * Web version: SQLite compiled to WebAssembly, kept in memory and saved to
 * IndexedDB after every write. Works on any static host without special headers.
 */
export async function openAppDatabase(): Promise<Repositories> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('This browser cannot store data offline. Open the app in Safari.');
  }
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Persistence is best effort; installed home-screen apps keep their storage anyway.
  }
  const store = createIndexedDbSnapshotStore(indexedDB);
  const [SQL, snapshot] = await Promise.all([
    initSqlJs({ locateFile: () => webAssetUrl('sql-wasm-browser.wasm') }),
    store.load(),
  ]);
  const db = snapshot ? new SQL.Database(snapshot) : new SQL.Database();
  const driver = createSqlJsDriver(db, (bytes) => store.save(bytes));
  return initializeDatabase(driver);
}
