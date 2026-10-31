import type { Receipt, Repositories } from '@/data';
import { createId, nowTimestamp, type TransactionDraft, type TransactionWithLines } from '@/domain';

import type { LedgerService } from './ledger-service';
import type { Clock, IdGenerator, ReceiptFileStore } from './ports';

export type CapturedImage = {
  uri: string;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
};

function extensionFor(image: CapturedImage): string {
  const name = image.fileName ?? image.uri;
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/.exec(name);
  const extension = match?.[1]?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }
  if (image.mimeType === 'image/png') return 'png';
  return 'jpg';
}

export function createReceiptService(deps: {
  repos: Repositories;
  ledger: LedgerService;
  files: ReceiptFileStore;
  clock?: Clock;
  newId?: IdGenerator;
}) {
  const { repos, ledger, files } = deps;
  const now = () => deps.clock?.now() ?? new Date();
  const id = deps.newId ?? ((prefix: string) => createId(prefix));

  return {
    /** Saves a photo immediately so the amount can be added later. */
    async capture(image: CapturedImage, note = ''): Promise<Receipt> {
      const receiptId = id('rcpt');
      const fileName = `${receiptId}.${extensionFor(image)}`;
      await files.persist(image.uri, fileName);
      const receipt: Receipt = {
        id: receiptId,
        fileName,
        width: image.width ?? null,
        height: image.height ?? null,
        note: note.trim(),
        capturedAt: nowTimestamp(now()),
        transactionId: null,
        deletedAt: null,
      };
      try {
        await repos.receipts.insert(receipt);
      } catch (error) {
        await files.remove(fileName).catch(() => undefined);
        throw error;
      }
      return receipt;
    },

    async get(receiptId: string): Promise<Receipt | null> {
      return repos.receipts.getById(receiptId);
    },

    async listPending(): Promise<Receipt[]> {
      return repos.receipts.list('pending');
    },

    async listDone(): Promise<Receipt[]> {
      return repos.receipts.list('linked');
    },

    async countPending(): Promise<number> {
      return repos.receipts.countPending();
    },

    async forTransaction(transactionId: string): Promise<Receipt[]> {
      return repos.receipts.getByTransactionId(transactionId);
    },

    resolveUri(receipt: Pick<Receipt, 'fileName'>): Promise<string> {
      return files.resolveUri(receipt.fileName);
    },

    /** Creates the transaction for a pending receipt and links them in one write. */
    async recordTransaction(
      receiptId: string,
      draft: TransactionDraft,
    ): Promise<TransactionWithLines> {
      const receipt = await repos.receipts.getById(receiptId);
      if (!receipt || receipt.deletedAt) throw new Error('Receipt was not found.');
      const transaction = await ledger.createTransaction(draft);
      await repos.receipts.link(receiptId, transaction.id);
      return transaction;
    },

    async attach(receiptId: string, transactionId: string): Promise<void> {
      await repos.receipts.link(receiptId, transactionId);
    },

    /** Detaches a receipt from its transaction, returning it to the inbox. */
    async detach(receiptId: string): Promise<void> {
      await repos.receipts.link(receiptId, null);
    },

    async updateNote(receiptId: string, note: string): Promise<void> {
      await repos.receipts.updateNote(receiptId, note.trim());
    },

    /** Deletes every stored receipt image (used when erasing all data). */
    async removeAllFiles(): Promise<void> {
      await files.removeAll();
    },

    /** Removes the receipt record and its image file. */
    async remove(receiptId: string): Promise<void> {
      const receipt = await repos.receipts.getById(receiptId);
      if (!receipt) return;
      await repos.receipts.hardDelete(receiptId);
      await files.remove(receipt.fileName).catch(() => undefined);
    },
  };
}

export type ReceiptService = ReturnType<typeof createReceiptService>;
