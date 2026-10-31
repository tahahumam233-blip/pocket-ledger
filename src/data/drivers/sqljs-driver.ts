import type { BindParams, Database } from 'sql.js';

import { createSerialQueue, type SqlDriver, type SqlExecutor, type SqlParams } from '../sql';

/** Persists a full snapshot of the database file. Called after every committed write. */
export type SnapshotWriter = (bytes: Uint8Array) => Promise<void>;

const READ_ONLY_PREFIX = /^\s*(select|pragma\s+\w+\s*$|with\s)/i;

function toBind(params: SqlParams): BindParams {
  return params as unknown as BindParams;
}

/**
 * Adapts an in-memory sql.js database to the repository driver contract.
 *
 * sql.js keeps the database in memory, so every committed write is followed by
 * a snapshot that the caller stores durably (IndexedDB on the web). A write only
 * resolves once its snapshot has been saved, so "Saved" in the UI means saved.
 */
export function createSqlJsDriver(db: Database, saveSnapshot: SnapshotWriter): SqlDriver {
  const enqueue = createSerialQueue();
  let inTransaction = false;
  let dirty = false;

  const applyConnectionPragmas = () => {
    db.exec('PRAGMA foreign_keys = ON');
  };
  applyConnectionPragmas();

  const persistIfDirty = async () => {
    if (!dirty || inTransaction) return;
    dirty = false;
    // export() closes and reopens the connection, which resets pragmas.
    const bytes = db.export();
    applyConnectionPragmas();
    await saveSnapshot(bytes);
  };

  const markWrite = (sql: string) => {
    if (!READ_ONLY_PREFIX.test(sql)) dirty = true;
  };

  const executor: SqlExecutor = {
    exec: async (sql) => {
      db.exec(sql);
      markWrite(sql);
      await persistIfDirty();
    },
    run: async (sql, params: SqlParams = []) => {
      const statement = db.prepare(sql);
      try {
        statement.run(toBind(params));
      } finally {
        statement.free();
      }
      const changes = db.getRowsModified();
      dirty = true;
      await persistIfDirty();
      return { changes };
    },
    all: async <T extends object>(sql: string, params: SqlParams = []) => {
      const statement = db.prepare(sql);
      try {
        statement.bind(toBind(params));
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
    get: async <T extends object>(sql: string, params: SqlParams = []) => {
      const statement = db.prepare(sql);
      try {
        statement.bind(toBind(params));
        return statement.step() ? (statement.getAsObject() as T) : null;
      } finally {
        statement.free();
      }
    },
  };

  return {
    ...executor,
    transaction: (work) =>
      enqueue(async () => {
        db.exec('BEGIN');
        inTransaction = true;
        try {
          const result = await work(executor);
          db.exec('COMMIT');
          inTransaction = false;
          dirty = true;
          await persistIfDirty();
          return result;
        } catch (error) {
          inTransaction = false;
          try {
            db.exec('ROLLBACK');
          } catch {
            // SQLite may already have rolled back; keep the original error.
          }
          throw error;
        }
      }),
    close: async () => {
      await persistIfDirty();
      db.close();
    },
  };
}
