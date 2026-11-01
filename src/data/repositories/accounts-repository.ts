import type { Account, AccountClass } from '@/domain';

import { type AccountRow, mapAccount } from '../mappers';
import type { SqlExecutor } from '../sql';

const COLUMNS =
  'id, name, kind, account_class, icon, color, sort_order, note, due_date, created_at, archived_at';

export function createAccountsRepository(db: SqlExecutor) {
  return {
    /** Lists accounts; pass `accountClass` to get only money accounts or only people. */
    async list(
      options: { includeArchived?: boolean; accountClass?: AccountClass } = {},
    ): Promise<Account[]> {
      const clauses: string[] = [];
      const params: string[] = [];
      if (!options.includeArchived) clauses.push('archived_at IS NULL');
      if (options.accountClass) {
        clauses.push('account_class = ?');
        params.push(options.accountClass);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const order =
        options.accountClass === 'person'
          ? 'ORDER BY name COLLATE NOCASE ASC'
          : 'ORDER BY account_class ASC, sort_order ASC, created_at ASC';
      const rows = await db.all<AccountRow>(
        `SELECT ${COLUMNS} FROM accounts ${where} ${order}`,
        params,
      );
      return rows.map(mapAccount);
    },
    async getById(id: string): Promise<Account | null> {
      const row = await db.get<AccountRow>(`SELECT ${COLUMNS} FROM accounts WHERE id = ?`, [id]);
      return row ? mapAccount(row) : null;
    },
    async insert(account: Account, executor: SqlExecutor = db): Promise<void> {
      await executor.run(
        `INSERT INTO accounts (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id,
          account.name,
          account.kind,
          account.accountClass,
          account.icon,
          account.color,
          account.sortOrder,
          account.note,
          account.dueDate,
          account.createdAt,
          account.archivedAt,
        ],
      );
    },
    async update(
      id: string,
      changes: Partial<
        Pick<Account, 'name' | 'kind' | 'icon' | 'color' | 'sortOrder' | 'note' | 'dueDate'>
      >,
      executor: SqlExecutor = db,
    ): Promise<void> {
      const assignments: string[] = [];
      const params: (string | number | null)[] = [];
      if (changes.note !== undefined) {
        assignments.push('note = ?');
        params.push(changes.note);
      }
      if (changes.dueDate !== undefined) {
        assignments.push('due_date = ?');
        params.push(changes.dueDate);
      }
      if (changes.name !== undefined) {
        assignments.push('name = ?');
        params.push(changes.name);
      }
      if (changes.kind !== undefined) {
        assignments.push('kind = ?');
        params.push(changes.kind);
      }
      if (changes.icon !== undefined) {
        assignments.push('icon = ?');
        params.push(changes.icon);
      }
      if (changes.color !== undefined) {
        assignments.push('color = ?');
        params.push(changes.color);
      }
      if (changes.sortOrder !== undefined) {
        assignments.push('sort_order = ?');
        params.push(changes.sortOrder);
      }
      if (assignments.length === 0) return;
      params.push(id);
      await executor.run(`UPDATE accounts SET ${assignments.join(', ')} WHERE id = ?`, params);
    },
    async setArchived(id: string, archivedAt: string | null, executor: SqlExecutor = db) {
      await executor.run('UPDATE accounts SET archived_at = ? WHERE id = ?', [archivedAt, id]);
    },
    async hasHistory(id: string): Promise<boolean> {
      const row = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM ledger_lines WHERE account_id = ?',
        [id],
      );
      return (row?.n ?? 0) > 0;
    },
    /** Hard delete is only allowed for accounts without any ledger history. */
    async deleteIfUnused(id: string, executor: SqlExecutor = db): Promise<boolean> {
      if (await this.hasHistory(id)) return false;
      await executor.run('DELETE FROM accounts WHERE id = ?', [id]);
      return true;
    },
  };
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>;
