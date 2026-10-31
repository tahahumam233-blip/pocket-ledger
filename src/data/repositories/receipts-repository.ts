import { mapReceipt, type Receipt, type ReceiptRow } from '../mappers';
import type { SqlExecutor } from '../sql';

const COLUMNS = 'id, file_name, width, height, note, captured_at, transaction_id, deleted_at';

export type ReceiptStatus = 'pending' | 'linked' | 'all';

export function createReceiptsRepository(db: SqlExecutor) {
  return {
    async insert(receipt: Receipt, executor: SqlExecutor = db): Promise<void> {
      await executor.run(`INSERT INTO receipts (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        receipt.id,
        receipt.fileName,
        receipt.width,
        receipt.height,
        receipt.note,
        receipt.capturedAt,
        receipt.transactionId,
        receipt.deletedAt,
      ]);
    },
    async getById(id: string): Promise<Receipt | null> {
      const row = await db.get<ReceiptRow>(`SELECT ${COLUMNS} FROM receipts WHERE id = ?`, [id]);
      return row ? mapReceipt(row) : null;
    },
    async getByTransactionId(transactionId: string): Promise<Receipt[]> {
      const rows = await db.all<ReceiptRow>(
        `SELECT ${COLUMNS} FROM receipts WHERE transaction_id = ? AND deleted_at IS NULL ORDER BY captured_at ASC`,
        [transactionId],
      );
      return rows.map(mapReceipt);
    },
    async list(status: ReceiptStatus = 'all', limit = 500): Promise<Receipt[]> {
      const statusClause =
        status === 'pending'
          ? 'AND transaction_id IS NULL'
          : status === 'linked'
            ? 'AND transaction_id IS NOT NULL AND EXISTS (SELECT 1 FROM transactions t WHERE t.id = receipts.transaction_id AND t.deleted_at IS NULL)'
            : '';
      const rows = await db.all<ReceiptRow>(
        `SELECT ${COLUMNS} FROM receipts WHERE deleted_at IS NULL ${statusClause} ORDER BY captured_at DESC LIMIT ?`,
        [limit],
      );
      return rows.map(mapReceipt);
    },
    async countPending(): Promise<number> {
      const row = await db.get<{ n: number }>(
        'SELECT COUNT(*) AS n FROM receipts WHERE deleted_at IS NULL AND transaction_id IS NULL',
      );
      return row?.n ?? 0;
    },
    async link(
      id: string,
      transactionId: string | null,
      executor: SqlExecutor = db,
    ): Promise<void> {
      await executor.run('UPDATE receipts SET transaction_id = ? WHERE id = ?', [
        transactionId,
        id,
      ]);
    },
    async updateNote(id: string, note: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run('UPDATE receipts SET note = ? WHERE id = ?', [note, id]);
    },
    async setDeleted(
      id: string,
      deletedAt: string | null,
      executor: SqlExecutor = db,
    ): Promise<void> {
      await executor.run('UPDATE receipts SET deleted_at = ? WHERE id = ?', [deletedAt, id]);
    },
    async hardDelete(id: string, executor: SqlExecutor = db): Promise<void> {
      await executor.run('DELETE FROM receipts WHERE id = ?', [id]);
    },
  };
}

export type ReceiptsRepository = ReturnType<typeof createReceiptsRepository>;
