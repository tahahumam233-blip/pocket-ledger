import type { LedgerLine, Transaction, TransactionKind, TransactionWithLines } from '@/domain';

import { type LedgerLineRow, mapLedgerLine, mapTransaction, type TransactionRow } from '../mappers';
import { placeholders, type SqlExecutor, type SqlValue } from '../sql';

const TX_COLUMNS =
  'id, kind, debt_action, posted_date, category_id, note, created_at, updated_at, deleted_at';
const LINE_COLUMNS = 'id, transaction_id, account_id, currency, amount_minor, role';

export type TransactionFilter = {
  dateFrom?: string;
  dateTo?: string;
  kinds?: TransactionKind[];
  accountId?: string;
  categoryId?: string;
  currency?: string;
  /** Matches notes, category names and people, case-insensitively. */
  search?: string;
  /** 'only' keeps money exchanged with people; 'exclude' leaves it out. */
  debts?: 'only' | 'exclude';
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
};

function buildWhere(filter: TransactionFilter): { sql: string; params: SqlValue[] } {
  const clauses: string[] = [];
  const params: SqlValue[] = [];
  if (!filter.includeDeleted) clauses.push('t.deleted_at IS NULL');
  if (filter.dateFrom) {
    clauses.push('t.posted_date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    clauses.push('t.posted_date <= ?');
    params.push(filter.dateTo);
  }
  if (filter.kinds && filter.kinds.length > 0) {
    clauses.push(`t.kind IN (${placeholders(filter.kinds.length)})`);
    params.push(...filter.kinds);
  }
  if (filter.categoryId) {
    clauses.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.accountId) {
    clauses.push(
      'EXISTS (SELECT 1 FROM ledger_lines la WHERE la.transaction_id = t.id AND la.account_id = ?)',
    );
    params.push(filter.accountId);
  }
  if (filter.currency) {
    clauses.push(
      'EXISTS (SELECT 1 FROM ledger_lines lc WHERE lc.transaction_id = t.id AND lc.currency = ?)',
    );
    params.push(filter.currency);
  }
  if (filter.debts === 'only') clauses.push('t.debt_action IS NOT NULL');
  if (filter.debts === 'exclude') clauses.push('t.debt_action IS NULL');
  if (filter.search && filter.search.trim()) {
    const needle = `%${filter.search.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(t.note) LIKE ?
        OR EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id AND LOWER(c.name) LIKE ?)
        OR EXISTS (SELECT 1 FROM ledger_lines lp JOIN accounts ap ON ap.id = lp.account_id
                   WHERE lp.transaction_id = t.id AND ap.account_class = 'person' AND LOWER(ap.name) LIKE ?))`,
    );
    params.push(needle, needle, needle);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function createTransactionsRepository(db: SqlExecutor) {
  async function linesFor(
    ids: string[],
    executor: SqlExecutor = db,
  ): Promise<Map<string, LedgerLine[]>> {
    const grouped = new Map<string, LedgerLine[]>();
    if (ids.length === 0) return grouped;
    const chunkSize = 400;
    for (let index = 0; index < ids.length; index += chunkSize) {
      const chunk = ids.slice(index, index + chunkSize);
      const rows = await executor.all<LedgerLineRow>(
        `SELECT ${LINE_COLUMNS} FROM ledger_lines WHERE transaction_id IN (${placeholders(chunk.length)}) ORDER BY role DESC, rowid ASC`,
        chunk,
      );
      for (const row of rows) {
        const line = mapLedgerLine(row);
        const list = grouped.get(line.transactionId) ?? [];
        list.push(line);
        grouped.set(line.transactionId, list);
      }
    }
    return grouped;
  }

  async function attachLines(
    transactions: Transaction[],
    executor: SqlExecutor = db,
  ): Promise<TransactionWithLines[]> {
    const lines = await linesFor(
      transactions.map((transaction) => transaction.id),
      executor,
    );
    return transactions.map((transaction) => ({
      ...transaction,
      lines: lines.get(transaction.id) ?? [],
    }));
  }

  return {
    async insert(
      transaction: Transaction,
      lines: LedgerLine[],
      executor: SqlExecutor,
    ): Promise<void> {
      await executor.run(
        `INSERT INTO transactions (${TX_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.kind,
          transaction.debtAction,
          transaction.postedDate,
          transaction.categoryId,
          transaction.note,
          transaction.createdAt,
          transaction.updatedAt,
          transaction.deletedAt,
        ],
      );
      for (const line of lines) {
        await executor.run(`INSERT INTO ledger_lines (${LINE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`, [
          line.id,
          line.transactionId,
          line.accountId,
          line.currency,
          line.amountMinor,
          line.role,
        ]);
      }
    },

    /** Replaces the editable fields and every ledger line of a transaction atomically. */
    async replace(
      transaction: Pick<
        Transaction,
        'id' | 'kind' | 'debtAction' | 'postedDate' | 'categoryId' | 'note' | 'updatedAt'
      >,
      lines: LedgerLine[],
      executor: SqlExecutor,
    ): Promise<void> {
      await executor.run(
        'UPDATE transactions SET kind = ?, debt_action = ?, posted_date = ?, category_id = ?, note = ?, updated_at = ? WHERE id = ?',
        [
          transaction.kind,
          transaction.debtAction,
          transaction.postedDate,
          transaction.categoryId,
          transaction.note,
          transaction.updatedAt,
          transaction.id,
        ],
      );
      await executor.run('DELETE FROM ledger_lines WHERE transaction_id = ?', [transaction.id]);
      for (const line of lines) {
        await executor.run(`INSERT INTO ledger_lines (${LINE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`, [
          line.id,
          line.transactionId,
          line.accountId,
          line.currency,
          line.amountMinor,
          line.role,
        ]);
      }
    },

    async setDeleted(
      id: string,
      deletedAt: string | null,
      executor: SqlExecutor = db,
    ): Promise<void> {
      await executor.run('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [
        deletedAt,
        deletedAt ?? new Date().toISOString(),
        id,
      ]);
    },

    async getById(id: string, executor: SqlExecutor = db): Promise<TransactionWithLines | null> {
      const row = await executor.get<TransactionRow>(
        `SELECT ${TX_COLUMNS} FROM transactions WHERE id = ?`,
        [id],
      );
      if (!row) return null;
      const [withLines] = await attachLines([mapTransaction(row)], executor);
      return withLines ?? null;
    },

    async list(filter: TransactionFilter = {}): Promise<TransactionWithLines[]> {
      const where = buildWhere(filter);
      const limit = filter.limit ?? 500;
      const offset = filter.offset ?? 0;
      const rows = await db.all<TransactionRow>(
        `SELECT ${TX_COLUMNS.split(', ')
          .map((column) => `t.${column}`)
          .join(
            ', ',
          )} FROM transactions t ${where.sql} ORDER BY t.posted_date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
        [...where.params, limit, offset],
      );
      return attachLines(rows.map(mapTransaction));
    },

    async count(filter: TransactionFilter = {}): Promise<number> {
      const where = buildWhere(filter);
      const row = await db.get<{ n: number }>(
        `SELECT COUNT(*) AS n FROM transactions t ${where.sql}`,
        where.params,
      );
      return row?.n ?? 0;
    },

    async currencyHasHistory(currency: string): Promise<boolean> {
      const row = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM ledger_lines WHERE currency = ?',
        [currency],
      );
      return (row?.n ?? 0) > 0;
    },

    /** Permanently removes soft-deleted transactions older than the cutoff. */
    async purgeDeletedBefore(cutoff: string, executor: SqlExecutor = db): Promise<number> {
      const result = await executor.run(
        'DELETE FROM transactions WHERE deleted_at IS NOT NULL AND deleted_at < ?',
        [cutoff],
      );
      return result.changes;
    },
  };
}

export type TransactionsRepository = ReturnType<typeof createTransactionsRepository>;
