import initSqlJs from 'sql.js';

import { createSqlJsDriver } from '@/data/drivers/sqljs-driver';

/** sql.js driver for tests; exposes every saved snapshot so persistence can be checked. */
export async function createTestSqlJsDriver(initial?: Uint8Array) {
  const SQL = await initSqlJs();
  const snapshots: Uint8Array[] = [];
  const db = initial ? new SQL.Database(initial) : new SQL.Database();
  const driver = createSqlJsDriver(db, async (bytes) => {
    snapshots.push(bytes);
  });
  return { SQL, driver, snapshots };
}
