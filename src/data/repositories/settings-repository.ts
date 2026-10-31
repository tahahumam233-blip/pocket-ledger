import type { SqlExecutor } from '../sql';

export function createSettingsRepository(db: SqlExecutor) {
  return {
    async get(key: string): Promise<string | null> {
      const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
        key,
      ]);
      return row?.value ?? null;
    },
    async getAll(): Promise<Record<string, string>> {
      const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
      const result: Record<string, string> = {};
      for (const row of rows) result[row.key] = row.value;
      return result;
    },
    async set(key: string, value: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value],
      );
    },
    async setMany(entries: Record<string, string>, executor: SqlExecutor = db): Promise<void> {
      for (const [key, value] of Object.entries(entries)) {
        await this.set(key, value, executor);
      }
    },
    async remove(key: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run('DELETE FROM settings WHERE key = ?', [key]);
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
