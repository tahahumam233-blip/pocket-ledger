export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export type SqlRunResult = { changes: number };

/** The subset of SQLite operations repositories need, usable inside or outside a transaction. */
export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<SqlRunResult>;
  all<T extends object>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T extends object>(sql: string, params?: SqlParams): Promise<T | null>;
}

export interface SqlDriver extends SqlExecutor {
  /** Runs `work` atomically; writes are serialized so transactions never nest or interleave. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** A tiny promise queue so write transactions run one at a time. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(task, task);
    tail = next.catch(() => undefined);
    return next;
  };
}

export function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}

export function toSqlBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function fromSqlBoolean(value: number | null | undefined): boolean {
  return value === 1;
}
