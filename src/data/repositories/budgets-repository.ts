import type { Budget } from '@/domain';

import { type BudgetRow, mapBudget } from '../mappers';
import type { SqlExecutor } from '../sql';

const COLUMNS = 'id, category_id, currency, amount_minor, created_at, updated_at';

/** Matches the budget for a category, or the one for all expenses when the category is null. */
const SCOPE = "IFNULL(category_id, '') = IFNULL(?, '') AND currency = ?";

export function createBudgetsRepository(db: SqlExecutor) {
  return {
    async list(options: { currency?: string } = {}): Promise<Budget[]> {
      const rows = await db.all<BudgetRow>(
        `SELECT ${COLUMNS} FROM budgets ${options.currency ? 'WHERE currency = ?' : ''}
          ORDER BY currency ASC, category_id IS NOT NULL, created_at ASC`,
        options.currency ? [options.currency] : [],
      );
      return rows.map(mapBudget);
    },

    async find(categoryId: string | null, currency: string): Promise<Budget | null> {
      const row = await db.get<BudgetRow>(`SELECT ${COLUMNS} FROM budgets WHERE ${SCOPE}`, [
        categoryId,
        currency,
      ]);
      return row ? mapBudget(row) : null;
    },

    async insert(budget: Budget, executor: SqlExecutor = db): Promise<void> {
      await executor.run(`INSERT INTO budgets (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`, [
        budget.id,
        budget.categoryId,
        budget.currency,
        budget.amountMinor,
        budget.createdAt,
        budget.updatedAt,
      ]);
    },

    async updateAmount(
      id: string,
      amountMinor: number,
      updatedAt: string,
      executor: SqlExecutor = db,
    ): Promise<void> {
      await executor.run('UPDATE budgets SET amount_minor = ?, updated_at = ? WHERE id = ?', [
        amountMinor,
        updatedAt,
        id,
      ]);
    },

    async remove(categoryId: string | null, currency: string, executor: SqlExecutor = db) {
      await executor.run(`DELETE FROM budgets WHERE ${SCOPE}`, [categoryId, currency]);
    },

    async removeForCategory(categoryId: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run('DELETE FROM budgets WHERE category_id = ?', [categoryId]);
    },

    async removeForCurrency(currency: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run('DELETE FROM budgets WHERE currency = ?', [currency]);
    },
  };
}

export type BudgetsRepository = ReturnType<typeof createBudgetsRepository>;
