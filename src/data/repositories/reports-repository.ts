import type {
  CsvTransactionRow,
  DebtAction,
  ReportLine,
  StatementSourceLine,
  TransactionKind,
} from '@/domain';

import type { SqlExecutor } from '../sql';

export type BalanceRow = { accountId: string; currency: string; balanceMinor: number };

export function createReportsRepository(db: SqlExecutor) {
  return {
    /** Balances are always derived from active ledger lines; nothing stores a balance. */
    async balances(): Promise<BalanceRow[]> {
      const rows = await db.all<{ account_id: string; currency: string; balance: number }>(
        `SELECT l.account_id, l.currency, SUM(l.amount_minor) AS balance
         FROM ledger_lines l
         JOIN transactions t ON t.id = l.transaction_id
         WHERE t.deleted_at IS NULL
         GROUP BY l.account_id, l.currency
         ORDER BY l.account_id, l.currency`,
      );
      return rows.map((row) => ({
        accountId: row.account_id,
        currency: row.currency,
        balanceMinor: row.balance,
      }));
    },

    async reportLines(dateFrom: string, dateTo: string): Promise<ReportLine[]> {
      const rows = await db.all<{
        transaction_id: string;
        kind: TransactionKind;
        category_id: string | null;
        account_id: string;
        currency: string;
        amount_minor: number;
        posted_date: string;
      }>(
        `SELECT t.id AS transaction_id, t.kind, t.category_id, l.account_id, l.currency, l.amount_minor, t.posted_date
         FROM ledger_lines l
         JOIN transactions t ON t.id = l.transaction_id
         WHERE t.deleted_at IS NULL AND t.posted_date >= ? AND t.posted_date <= ?
         ORDER BY t.posted_date ASC`,
        [dateFrom, dateTo],
      );
      return rows.map((row) => ({
        transactionId: row.transaction_id,
        kind: row.kind,
        categoryId: row.category_id,
        accountId: row.account_id,
        currency: row.currency,
        amountMinor: row.amount_minor,
        postedDate: row.posted_date,
      }));
    },

    async csvRows(): Promise<CsvTransactionRow[]> {
      const rows = await db.all<{
        transaction_id: string;
        posted_date: string;
        kind: string;
        account: string;
        category: string | null;
        currency: string;
        amount_minor: number;
        note: string;
        receipts: number;
        created_at: string;
      }>(
        `SELECT t.id AS transaction_id, t.posted_date, COALESCE(t.debt_action, t.kind) AS kind,
                a.name AS account, c.name AS category,
                l.currency, l.amount_minor, t.note, t.created_at,
                (SELECT COUNT(*) FROM receipts r WHERE r.transaction_id = t.id AND r.deleted_at IS NULL) AS receipts
         FROM ledger_lines l
         JOIN transactions t ON t.id = l.transaction_id
         JOIN accounts a ON a.id = l.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.deleted_at IS NULL
         ORDER BY t.posted_date DESC, t.created_at DESC, l.rowid ASC`,
      );
      return rows.map((row) => ({
        transactionId: row.transaction_id,
        postedDate: row.posted_date,
        kind: row.kind,
        account: row.account,
        category: row.category ?? '',
        currency: row.currency,
        amountMinor: row.amount_minor,
        note: row.note,
        hasReceipt: row.receipts > 0,
        createdAt: row.created_at,
      }));
    },

    /** Every active line on one account in one currency, oldest first, for a statement. */
    async statementLines(accountId: string, currency: string): Promise<StatementSourceLine[]> {
      const rows = await db.all<{
        transaction_id: string;
        posted_date: string;
        created_at: string;
        kind: TransactionKind;
        debt_action: DebtAction | null;
        amount_minor: number;
        note: string;
        category_name: string | null;
        counter_account_name: string | null;
      }>(
        `SELECT t.id AS transaction_id, t.posted_date, t.created_at, t.kind, t.debt_action,
                l.amount_minor, t.note, c.name AS category_name,
                (SELECT a2.name FROM ledger_lines l2 JOIN accounts a2 ON a2.id = l2.account_id
                 WHERE l2.transaction_id = t.id AND l2.id <> l.id LIMIT 1) AS counter_account_name
         FROM ledger_lines l
         JOIN transactions t ON t.id = l.transaction_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE l.account_id = ? AND l.currency = ? AND t.deleted_at IS NULL
         ORDER BY t.posted_date ASC, t.created_at ASC, t.id ASC`,
        [accountId, currency],
      );
      return rows.map((row) => ({
        transactionId: row.transaction_id,
        postedDate: row.posted_date,
        createdAt: row.created_at,
        kind: row.kind,
        debtAction: row.debt_action,
        amountMinor: row.amount_minor,
        note: row.note,
        categoryName: row.category_name,
        counterAccountName: row.counter_account_name,
      }));
    },

    async counts(): Promise<{ transactions: number; receipts: number }> {
      const tx = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM transactions WHERE deleted_at IS NULL',
      );
      const receipts = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM receipts WHERE deleted_at IS NULL',
      );
      return { transactions: tx?.n ?? 0, receipts: receipts?.n ?? 0 };
    },
  };
}

export type ReportsRepository = ReturnType<typeof createReportsRepository>;
