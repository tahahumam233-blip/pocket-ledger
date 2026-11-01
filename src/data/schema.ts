import type { SqlExecutor } from './sql';

export type Migration = { version: number; name: string; statements: string[] };

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial ledger schema',
    statements: [
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('safe', 'pocket', 'bank', 'other')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        archived_at TEXT
      )`,
      `CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT
      )`,
      `CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'transfer', 'opening', 'adjustment')),
        posted_date TEXT NOT NULL CHECK (length(posted_date) = 10),
        category_id TEXT REFERENCES categories(id),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
      `CREATE TABLE ledger_lines (
        id TEXT PRIMARY KEY NOT NULL,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES accounts(id),
        currency TEXT NOT NULL CHECK (length(currency) = 3),
        amount_minor INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('main', 'source', 'destination'))
      )`,
      `CREATE TABLE receipts (
        id TEXT PRIMARY KEY NOT NULL,
        file_name TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        note TEXT NOT NULL DEFAULT '',
        captured_at TEXT NOT NULL,
        transaction_id TEXT REFERENCES transactions(id),
        deleted_at TEXT
      )`,
      `CREATE INDEX idx_ledger_lines_transaction ON ledger_lines(transaction_id)`,
      `CREATE INDEX idx_ledger_lines_account_currency ON ledger_lines(account_id, currency)`,
      `CREATE INDEX idx_transactions_posted_date ON transactions(posted_date)`,
      `CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at)`,
      `CREATE INDEX idx_transactions_category ON transactions(category_id)`,
      `CREATE INDEX idx_receipts_transaction ON receipts(transaction_id)`,
    ],
  },
  {
    version: 2,
    name: 'people and debts',
    // Additive only: existing ledgers keep every row; new columns get defaults.
    statements: [
      `ALTER TABLE accounts ADD COLUMN account_class TEXT NOT NULL DEFAULT 'money' CHECK (account_class IN ('money', 'person'))`,
      `ALTER TABLE accounts ADD COLUMN note TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE accounts ADD COLUMN due_date TEXT CHECK (due_date IS NULL OR length(due_date) = 10)`,
      `ALTER TABLE transactions ADD COLUMN debt_action TEXT CHECK (debt_action IS NULL OR debt_action IN ('lend', 'borrow', 'collect', 'repay'))`,
      `CREATE INDEX idx_accounts_class ON accounts(account_class)`,
    ],
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function getSchemaVersion(executor: SqlExecutor): Promise<number> {
  const row = await executor.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Applies pending migrations in order. Each migration runs inside its own transaction. */
export async function migrate(
  driver: { transaction: <T>(work: (tx: SqlExecutor) => Promise<T>) => Promise<T> } & SqlExecutor,
): Promise<{ from: number; to: number }> {
  const from = await getSchemaVersion(driver);
  let current = from;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await driver.transaction(async (tx) => {
      for (const statement of migration.statements) {
        await tx.exec(statement);
      }
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }
  return { from, to: current };
}
