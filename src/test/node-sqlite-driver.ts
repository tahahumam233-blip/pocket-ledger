/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import { createSerialQueue, type SqlDriver, type SqlExecutor, type SqlParams } from '@/data/sql';

/**
 * Test-only driver backed by Node's built-in SQLite so repositories can be
 * exercised against a real SQL engine without a device. Never imported by app code.
 */
export function createNodeSqliteDriver(path = ':memory:'): SqlDriver {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  const enqueue = createSerialQueue();

  const executor: SqlExecutor = {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params: SqlParams = []) => {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    all: async <T extends object>(sql: string, params: SqlParams = []) =>
      db.prepare(sql).all(...params) as T[],
    get: async <T extends object>(sql: string, params: SqlParams = []) =>
      (db.prepare(sql).get(...params) as T | undefined) ?? null,
  };

  return {
    ...executor,
    transaction: (work) =>
      enqueue(async () => {
        db.exec('BEGIN');
        try {
          const result = await work(executor);
          db.exec('COMMIT');
          return result;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      }),
    close: async () => {
      db.close();
    },
  };
}
