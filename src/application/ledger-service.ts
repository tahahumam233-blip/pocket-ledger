import type { Repositories } from '@/data';
import {
  assertValidDraft,
  type Account,
  type Category,
  createId,
  type CurrencyCode,
  draftFromTransaction,
  type DraftContext,
  type IsoDate,
  LedgerError,
  type LedgerLine,
  type MinorUnits,
  nowTimestamp,
  type Transaction,
  type TransactionDraft,
  type TransactionWithLines,
} from '@/domain';

import type { Clock, IdGenerator } from './ports';
import { parseSettings } from './settings';

export type LedgerServiceDeps = {
  repos: Repositories;
  clock?: Clock;
  newId?: IdGenerator;
};

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} was not found.`);
    this.name = 'NotFoundError';
  }
}

export function createLedgerService({ repos, clock, newId }: LedgerServiceDeps) {
  const now = () => clock?.now() ?? new Date();
  const id = newId ?? ((prefix: string) => createId(prefix));

  async function loadContext(): Promise<DraftContext> {
    const [accounts, categories, settingsRecord] = await Promise.all([
      repos.accounts.list({ includeArchived: true }),
      repos.categories.list({ includeArchived: true }),
      repos.settings.getAll(),
    ]);
    return {
      accounts: new Map(accounts.map((account): [string, Account] => [account.id, account])),
      categories: new Map(
        categories.map((category): [string, Category] => [category.id, category]),
      ),
      currencies: new Set(parseSettings(settingsRecord).currencies),
    };
  }

  function buildLines(transactionId: string, inputs: Omit<LedgerLine, 'id' | 'transactionId'>[]) {
    return inputs.map((input) => ({ ...input, id: id('line'), transactionId }));
  }

  return {
    loadContext,

    /** Validates and records a transaction and its lines atomically. */
    async createTransaction(
      draft: TransactionDraft,
      options: { context?: DraftContext; createdAt?: string } = {},
    ): Promise<TransactionWithLines> {
      const context = options.context ?? (await loadContext());
      const validated = assertValidDraft(draft, context);
      const timestamp = options.createdAt ?? nowTimestamp(now());
      const transaction: Transaction = {
        id: id('txn'),
        kind: draft.kind,
        postedDate: draft.postedDate,
        categoryId: validated.categoryId,
        note: draft.note.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };
      const lines = buildLines(transaction.id, validated.lines);
      await repos.driver.transaction(async (tx) => {
        await repos.transactions.insert(transaction, lines, tx);
      });
      return { ...transaction, lines };
    },

    /** Replaces a transaction completely; validation happens before the write transaction opens. */
    async updateTransaction(
      transactionId: string,
      draft: TransactionDraft,
    ): Promise<TransactionWithLines> {
      const existing = await repos.transactions.getById(transactionId);
      if (!existing) throw new NotFoundError('Transaction');
      const context = await loadContext();
      const validated = assertValidDraft(draft, context);
      const updatedAt = nowTimestamp(now());
      const lines = buildLines(transactionId, validated.lines);
      const header = {
        id: transactionId,
        kind: draft.kind,
        postedDate: draft.postedDate,
        categoryId: validated.categoryId,
        note: draft.note.trim(),
        updatedAt,
      };
      await repos.driver.transaction(async (tx) => {
        await repos.transactions.replace(header, lines, tx);
      });
      return { ...existing, ...header, lines };
    },

    async deleteTransaction(transactionId: string): Promise<void> {
      const existing = await repos.transactions.getById(transactionId);
      if (!existing) throw new NotFoundError('Transaction');
      await repos.transactions.setDeleted(transactionId, nowTimestamp(now()));
    },

    /** Restores a soft-deleted transaction after re-checking every invariant. */
    async restoreTransaction(transactionId: string): Promise<TransactionWithLines> {
      const existing = await repos.transactions.getById(transactionId);
      if (!existing) throw new NotFoundError('Transaction');
      if (!existing.deletedAt) return existing;
      const draft = draftFromTransaction(existing);
      if (!draft) {
        throw new LedgerError([
          {
            field: 'transaction',
            code: 'amount_invalid',
            message: 'This entry cannot be restored.',
          },
        ]);
      }
      assertValidDraft(draft, await loadContext());
      await repos.transactions.setDeleted(transactionId, null);
      return { ...existing, deletedAt: null };
    },

    async getTransaction(transactionId: string): Promise<TransactionWithLines | null> {
      return repos.transactions.getById(transactionId);
    },

    /** Ledger-derived balance for one account and currency. */
    async getBalance(accountId: string, currency: CurrencyCode): Promise<MinorUnits> {
      const rows = await repos.reports.balances();
      return (
        rows.find((row) => row.accountId === accountId && row.currency === currency)
          ?.balanceMinor ?? 0
      );
    },

    /** Records an opening balance as a ledger transaction. Zero amounts write nothing. */
    async setOpeningBalance(input: {
      accountId: string;
      currency: CurrencyCode;
      amountMinor: MinorUnits;
      postedDate: IsoDate;
      context?: DraftContext;
    }): Promise<TransactionWithLines | null> {
      if (input.amountMinor === 0) return null;
      return this.createTransaction(
        {
          kind: 'opening',
          accountId: input.accountId,
          currency: input.currency,
          amountMinor: input.amountMinor,
          postedDate: input.postedDate,
          note: 'Opening balance',
        },
        { context: input.context },
      );
    },

    /**
     * Reconciles an account to what you actually hold by appending an
     * adjustment for the difference. History is never rewritten.
     */
    async adjustBalance(input: {
      accountId: string;
      currency: CurrencyCode;
      actualMinor: MinorUnits;
      postedDate: IsoDate;
      note?: string;
    }): Promise<{ difference: MinorUnits; transaction: TransactionWithLines | null }> {
      const ledger = await this.getBalance(input.accountId, input.currency);
      const difference = input.actualMinor - ledger;
      if (difference === 0) return { difference, transaction: null };
      const transaction = await this.createTransaction({
        kind: 'adjustment',
        accountId: input.accountId,
        currency: input.currency,
        amountMinor: difference,
        postedDate: input.postedDate,
        note: input.note?.trim() || 'Balance adjustment',
      });
      return { difference, transaction };
    },
  };
}

export type LedgerService = ReturnType<typeof createLedgerService>;
