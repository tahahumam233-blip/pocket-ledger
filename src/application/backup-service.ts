import type { Repositories, SqlValue } from '@/data';
import { CURRENT_SCHEMA_VERSION } from '@/data/schema';
import { nowTimestamp, todayIsoDate } from '@/domain';

import type { Clock, ReceiptFileStore } from './ports';
import { SETTINGS_KEYS } from './settings';

export const BACKUP_FORMAT = 'pocket-ledger-backup';
export const BACKUP_VERSION = 1;

type Row = Record<string, SqlValue>;

/** Tables in dependency order: parents before children. */
const TABLES = [
  {
    name: 'settings',
    columns: { key: 'text', value: 'text' },
  },
  {
    name: 'accounts',
    columns: {
      id: 'text',
      name: 'text',
      kind: 'text',
      icon: 'text',
      color: 'text',
      sort_order: 'integer',
      created_at: 'text',
      archived_at: 'text?',
    },
  },
  {
    name: 'categories',
    columns: {
      id: 'text',
      name: 'text',
      kind: 'text',
      icon: 'text',
      color: 'text',
      sort_order: 'integer',
      is_system: 'integer',
      archived_at: 'text?',
    },
  },
  {
    name: 'transactions',
    columns: {
      id: 'text',
      kind: 'text',
      posted_date: 'text',
      category_id: 'text?',
      note: 'text',
      created_at: 'text',
      updated_at: 'text',
      deleted_at: 'text?',
    },
  },
  {
    name: 'ledger_lines',
    columns: {
      id: 'text',
      transaction_id: 'text',
      account_id: 'text',
      currency: 'text',
      amount_minor: 'integer',
      role: 'text',
    },
  },
  {
    name: 'receipts',
    columns: {
      id: 'text',
      file_name: 'text',
      width: 'integer?',
      height: 'integer?',
      note: 'text',
      captured_at: 'text',
      transaction_id: 'text?',
      deleted_at: 'text?',
    },
  },
] as const;

type TableName = (typeof TABLES)[number]['name'];
type ColumnType = 'text' | 'text?' | 'integer' | 'integer?';

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<TableName, Row[]>;
  /** Receipt images as base64, keyed by file name. */
  files: Record<string, string>;
};

export type BackupSummary = {
  transactions: number;
  accounts: number;
  receipts: number;
  missingFiles: number;
};

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const SAFE_FILE_NAME = /^[A-Za-z0-9_.-]{1,120}$/;

function checkValue(value: unknown, type: ColumnType): boolean {
  const optional = type.endsWith('?');
  if (value === null) return optional;
  if (type.startsWith('text')) return typeof value === 'string';
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Validates the shape of a parsed backup before anything on the phone is touched. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not a Pocket Ledger backup.');
  }
  if (typeof data !== 'object' || data === null) {
    throw new BackupError('That file is not a Pocket Ledger backup.');
  }
  const candidate = data as Partial<BackupFile>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new BackupError('That file is not a Pocket Ledger backup.');
  }
  if (candidate.version !== BACKUP_VERSION) {
    throw new BackupError('This backup was made by a different version of the app.');
  }
  if (
    typeof candidate.schemaVersion !== 'number' ||
    candidate.schemaVersion > CURRENT_SCHEMA_VERSION
  ) {
    throw new BackupError('This backup is newer than this app. Update the app and try again.');
  }
  if (typeof candidate.tables !== 'object' || candidate.tables === null) {
    throw new BackupError('The backup is missing its data.');
  }
  for (const table of TABLES) {
    const rows = (candidate.tables as Record<string, unknown>)[table.name];
    if (!Array.isArray(rows)) throw new BackupError(`The backup is missing ${table.name}.`);
    for (const row of rows) {
      if (typeof row !== 'object' || row === null) {
        throw new BackupError(`The backup has a damaged ${table.name} entry.`);
      }
      for (const [column, type] of Object.entries(table.columns) as [string, ColumnType][]) {
        if (!checkValue((row as Record<string, unknown>)[column], type)) {
          throw new BackupError(`The backup has a damaged ${table.name} entry.`);
        }
      }
    }
  }
  const files = candidate.files ?? {};
  if (typeof files !== 'object' || files === null) {
    throw new BackupError('The backup photos are damaged.');
  }
  for (const [name, content] of Object.entries(files)) {
    if (!SAFE_FILE_NAME.test(name) || typeof content !== 'string') {
      throw new BackupError('The backup photos are damaged.');
    }
  }
  return candidate as BackupFile;
}

export function createBackupService(deps: {
  repos: Repositories;
  files: ReceiptFileStore;
  clock?: Clock;
}) {
  const { repos, files } = deps;
  const now = () => deps.clock?.now() ?? new Date();

  return {
    /** Collects every table and every receipt photo into one JSON document. */
    async create(): Promise<{
      fileName: string;
      content: string;
      exportedAt: string;
      summary: BackupSummary;
    }> {
      const tables = {} as Record<TableName, Row[]>;
      for (const table of TABLES) {
        const columns = Object.keys(table.columns).join(', ');
        tables[table.name] = await repos.driver.all<Row>(
          `SELECT ${columns} FROM ${table.name} ORDER BY rowid ASC`,
        );
      }
      const photos: Record<string, string> = {};
      let missingFiles = 0;
      for (const receipt of tables.receipts) {
        const fileName = String(receipt.file_name);
        const base64 = await files.readBase64(fileName).catch(() => null);
        if (base64) photos[fileName] = base64;
        else missingFiles += 1;
      }
      const backup: BackupFile = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: nowTimestamp(now()),
        tables,
        files: photos,
      };
      return {
        exportedAt: backup.exportedAt,
        fileName: `pocket-ledger-backup-${todayIsoDate(now())}.json`,
        content: JSON.stringify(backup),
        summary: {
          transactions: tables.transactions.filter((row) => row.deleted_at === null).length,
          accounts: tables.accounts.length,
          receipts: tables.receipts.length,
          missingFiles,
        },
      };
    },

    /** Remembers when the last backup file was actually saved somewhere. */
    async markSaved(exportedAt: string): Promise<void> {
      await repos.settings.set(SETTINGS_KEYS.lastBackupAt, exportedAt);
    },

    /**
     * Replaces everything on this phone with the backup. The database is
     * replaced in one transaction; if any row breaks a rule nothing changes.
     */
    async restore(text: string): Promise<BackupSummary> {
      const backup = parseBackup(text);
      await repos.driver.transaction(async (tx) => {
        for (const table of [...TABLES].reverse()) {
          await tx.run(`DELETE FROM ${table.name}`);
        }
        for (const table of TABLES) {
          const columns = Object.keys(table.columns);
          const sql = `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
          for (const row of backup.tables[table.name]) {
            await tx.run(
              sql,
              columns.map((column) => row[column] ?? null),
            );
          }
        }
        // Force the nightly reminder to be scheduled again on this device.
        await tx.run('DELETE FROM settings WHERE key = ?', [SETTINGS_KEYS.reminderSignature]);
      });

      await files.removeAll().catch(() => undefined);
      let missingFiles = 0;
      for (const receipt of backup.tables.receipts) {
        const fileName = String(receipt.file_name);
        const base64 = backup.files[fileName];
        if (!base64) {
          missingFiles += 1;
          continue;
        }
        try {
          await files.writeBase64(fileName, base64);
        } catch {
          missingFiles += 1;
        }
      }
      return {
        transactions: backup.tables.transactions.filter((row) => row.deleted_at === null).length,
        accounts: backup.tables.accounts.length,
        receipts: backup.tables.receipts.length,
        missingFiles,
      };
    },
  };
}

export type BackupService = ReturnType<typeof createBackupService>;
