import type { SQLiteDatabase } from 'expo-sqlite';

import { createSerialQueue, type SqlDriver, type SqlExecutor, type SqlParams } from '../sql';

function createExecutor(db: SQLiteDatabase): SqlExecutor {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlParams = []) => {
      const result = await db.runAsync(sql, [...params]);
      return { changes: result.changes };
    },
    all: <T extends object>(sql: string, params: SqlParams = []) =>
      db.getAllAsync<T>(sql, [...params]),
    get: <T extends object>(sql: string, params: SqlParams = []) =>
      db.getFirstAsync<T>(sql, [...params]),
  };
}

/**
 * Adapts an expo-sqlite connection to the repository driver contract.
 * Transactions use the same connection and are queued so they never overlap.
 */
export function createExpoSqliteDriver(db: SQLiteDatabase): SqlDriver {
  const executor = createExecutor(db);
  const enqueue = createSerialQueue();
  return {
    ...executor,
    transaction: (work) =>
      enqueue(async () => {
        let result: Awaited<ReturnType<typeof work>> | undefined;
        await db.withTransactionAsync(async () => {
          result = await work(executor);
        });
        return result as Awaited<ReturnType<typeof work>>;
      }),
    close: () => db.closeAsync(),
  };
}
