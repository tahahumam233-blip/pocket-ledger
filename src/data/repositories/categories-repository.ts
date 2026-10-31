import type { Category } from '@/domain';

import { type CategoryRow, mapCategory } from '../mappers';
import { type SqlExecutor, toSqlBoolean } from '../sql';

const COLUMNS = 'id, name, kind, icon, color, sort_order, is_system, archived_at';

export function createCategoriesRepository(db: SqlExecutor) {
  return {
    async list(options: { includeArchived?: boolean } = {}): Promise<Category[]> {
      const where = options.includeArchived ? '' : 'WHERE archived_at IS NULL';
      const rows = await db.all<CategoryRow>(
        `SELECT ${COLUMNS} FROM categories ${where} ORDER BY kind ASC, sort_order ASC, name ASC`,
      );
      return rows.map(mapCategory);
    },
    async getById(id: string): Promise<Category | null> {
      const row = await db.get<CategoryRow>(`SELECT ${COLUMNS} FROM categories WHERE id = ?`, [id]);
      return row ? mapCategory(row) : null;
    },
    async count(): Promise<number> {
      const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
      return row?.n ?? 0;
    },
    async insert(category: Category, executor: SqlExecutor = db): Promise<void> {
      await executor.run(`INSERT INTO categories (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        category.id,
        category.name,
        category.kind,
        category.icon,
        category.color,
        category.sortOrder,
        toSqlBoolean(category.isSystem),
        category.archivedAt,
      ]);
    },
    async update(
      id: string,
      changes: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sortOrder'>>,
      executor: SqlExecutor = db,
    ): Promise<void> {
      const assignments: string[] = [];
      const params: (string | number)[] = [];
      if (changes.name !== undefined) {
        assignments.push('name = ?');
        params.push(changes.name);
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
      await executor.run(`UPDATE categories SET ${assignments.join(', ')} WHERE id = ?`, params);
    },
    async setArchived(id: string, archivedAt: string | null, executor: SqlExecutor = db) {
      await executor.run('UPDATE categories SET archived_at = ? WHERE id = ?', [archivedAt, id]);
    },
    async hasHistory(id: string): Promise<boolean> {
      const row = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?',
        [id],
      );
      return (row?.n ?? 0) > 0;
    },
    async deleteIfUnused(id: string, executor: SqlExecutor = db): Promise<boolean> {
      if (await this.hasHistory(id)) return false;
      await executor.run('DELETE FROM categories WHERE id = ?', [id]);
      return true;
    },
  };
}

export type CategoriesRepository = ReturnType<typeof createCategoriesRepository>;
