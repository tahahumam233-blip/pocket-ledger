import { describe, expect, it } from '@jest/globals';

import {
  type Account,
  type Category,
  computeBalances,
  type DraftContext,
  draftFromTransaction,
  isBalancedTransfer,
  type TransactionWithLines,
  validateDraft,
} from './ledger';

const account = (
  id: string,
  archivedAt: string | null = null,
  accountClass: Account['accountClass'] = 'money',
): Account => ({
  id,
  name: id,
  kind: accountClass === 'person' ? 'other' : 'pocket',
  accountClass,
  icon: 'wallet',
  color: '#000',
  sortOrder: 0,
  note: '',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  archivedAt,
});

const category = (
  id: string,
  kind: Category['kind'],
  archivedAt: string | null = null,
): Category => ({
  id,
  name: id,
  kind,
  icon: 'cart',
  color: '#000',
  sortOrder: 0,
  isSystem: false,
  archivedAt,
});

const context: DraftContext = {
  accounts: new Map([
    ['pocket', account('pocket')],
    ['bank', account('bank')],
    ['old', account('old', '2026-01-02T00:00:00.000Z')],
    ['ali', account('ali', null, 'person')],
  ]),
  categories: new Map([
    ['food', category('food', 'expense')],
    ['salary', category('salary', 'income')],
    ['retired', category('retired', 'expense', '2026-01-02T00:00:00.000Z')],
  ]),
  currencies: new Set(['USD', 'IQD']),
};

describe('validateDraft', () => {
  it('creates a negative line for expenses and a positive line for income', () => {
    const expense = validateDraft(
      {
        kind: 'expense',
        accountId: 'pocket',
        currency: 'USD',
        amountMinor: 1250,
        categoryId: 'food',
        postedDate: '2026-10-31',
        note: 'Lunch',
      },
      context,
    );
    expect(expense).toEqual({
      ok: true,
      kind: 'expense',
      debtAction: null,
      categoryId: 'food',
      lines: [{ accountId: 'pocket', currency: 'USD', amountMinor: -1250, role: 'main' }],
    });

    const income = validateDraft(
      {
        kind: 'income',
        accountId: 'bank',
        currency: 'IQD',
        amountMinor: 1500000,
        categoryId: 'salary',
        postedDate: '2026-10-01',
        note: '',
      },
      context,
    );
    expect(income.ok && income.lines[0]?.amountMinor).toBe(1500000);
  });

  it('rejects zero, negative, fractional and oversized amounts', () => {
    const base = {
      kind: 'expense' as const,
      accountId: 'pocket',
      currency: 'USD',
      categoryId: 'food',
      postedDate: '2026-10-31',
      note: '',
    };
    for (const amountMinor of [0, -5, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      const result = validateDraft({ ...base, amountMinor }, context);
      expect(result.ok).toBe(false);
    }
  });

  it('requires matching, active categories and active known accounts', () => {
    const base = {
      kind: 'expense' as const,
      accountId: 'pocket',
      currency: 'USD',
      amountMinor: 100,
      postedDate: '2026-10-31',
      note: '',
    };
    const codes = (draft: Parameters<typeof validateDraft>[0]) => {
      const result = validateDraft(draft, context);
      return result.ok ? [] : result.errors.map((error) => error.code);
    };
    expect(codes({ ...base, categoryId: 'salary' })).toContain('category_kind_mismatch');
    expect(codes({ ...base, categoryId: 'retired' })).toContain('category_archived');
    expect(codes({ ...base, categoryId: 'missing' })).toContain('category_unknown');
    expect(codes({ ...base, categoryId: '' })).toContain('category_required');
    expect(codes({ ...base, categoryId: 'food', accountId: 'old' })).toContain('account_archived');
    expect(codes({ ...base, categoryId: 'food', accountId: 'nope' })).toContain('account_unknown');
    expect(codes({ ...base, categoryId: 'food', currency: 'EUR' })).toContain('currency_unknown');
    expect(codes({ ...base, categoryId: 'food', postedDate: '2026-02-30' })).toContain(
      'date_invalid',
    );
    expect(codes({ ...base, categoryId: 'food', note: 'x'.repeat(501) })).toContain(
      'note_too_long',
    );
  });

  it('builds zero-sum lines for same-currency transfers', () => {
    const result = validateDraft(
      {
        kind: 'transfer',
        fromAccountId: 'bank',
        toAccountId: 'pocket',
        currency: 'USD',
        amountMinor: 10000,
        postedDate: '2026-10-31',
        note: 'ATM',
      },
      context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toEqual([
      { accountId: 'bank', currency: 'USD', amountMinor: -10000, role: 'source' },
      { accountId: 'pocket', currency: 'USD', amountMinor: 10000, role: 'destination' },
    ]);
    expect(isBalancedTransfer(result.lines)).toBe(true);
    expect(result.categoryId).toBeNull();
  });

  it('supports exchanges between the two currencies and rejects incomplete ones', () => {
    const exchange = validateDraft(
      {
        kind: 'transfer',
        fromAccountId: 'pocket',
        toAccountId: 'pocket',
        currency: 'USD',
        amountMinor: 10000,
        toCurrency: 'IQD',
        toAmountMinor: 131000,
        postedDate: '2026-10-31',
        note: '',
      },
      context,
    );
    expect(exchange.ok).toBe(false);
    if (!exchange.ok) {
      expect(exchange.errors.map((e) => e.code)).toEqual(['same_account']);
    }

    const ok = validateDraft(
      {
        kind: 'transfer',
        fromAccountId: 'pocket',
        toAccountId: 'bank',
        currency: 'USD',
        amountMinor: 10000,
        toCurrency: 'IQD',
        toAmountMinor: 131000,
        postedDate: '2026-10-31',
        note: '',
      },
      context,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.lines[1]).toEqual({
        accountId: 'bank',
        currency: 'IQD',
        amountMinor: 131000,
        role: 'destination',
      });
      expect(isBalancedTransfer(ok.lines)).toBe(true);
    }

    const missing = validateDraft(
      {
        kind: 'transfer',
        fromAccountId: 'pocket',
        toAccountId: 'bank',
        currency: 'USD',
        amountMinor: 10000,
        toCurrency: 'IQD',
        postedDate: '2026-10-31',
        note: '',
      },
      context,
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors.map((e) => e.code)).toContain('exchange_amount_required');
    }
  });

  it('accepts signed opening balances and adjustments but not zero', () => {
    const opening = validateDraft(
      {
        kind: 'opening',
        accountId: 'bank',
        currency: 'USD',
        amountMinor: -2500,
        postedDate: '2026-01-01',
        note: 'Overdraft',
      },
      context,
    );
    expect(opening.ok && opening.lines[0]?.amountMinor).toBe(-2500);
    const zero = validateDraft(
      {
        kind: 'adjustment',
        accountId: 'bank',
        currency: 'USD',
        amountMinor: 0,
        postedDate: '2026-01-01',
        note: '',
      },
      context,
    );
    expect(zero.ok).toBe(false);
  });
});

describe('draftFromTransaction', () => {
  it('round-trips expenses, transfers and exchanges', () => {
    const expense: TransactionWithLines = {
      id: 't1',
      kind: 'expense',
      postedDate: '2026-10-31',
      categoryId: 'food',
      debtAction: null,
      note: 'Lunch',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      lines: [
        {
          id: 'l1',
          transactionId: 't1',
          accountId: 'pocket',
          currency: 'USD',
          amountMinor: -1250,
          role: 'main',
        },
      ],
    };
    expect(draftFromTransaction(expense)).toEqual({
      kind: 'expense',
      accountId: 'pocket',
      currency: 'USD',
      amountMinor: 1250,
      categoryId: 'food',
      postedDate: '2026-10-31',
      note: 'Lunch',
    });

    const exchange: TransactionWithLines = {
      ...expense,
      kind: 'transfer',
      categoryId: null,
      lines: [
        {
          id: 'l1',
          transactionId: 't1',
          accountId: 'pocket',
          currency: 'USD',
          amountMinor: -10000,
          role: 'source',
        },
        {
          id: 'l2',
          transactionId: 't1',
          accountId: 'bank',
          currency: 'IQD',
          amountMinor: 131000,
          role: 'destination',
        },
      ],
    };
    expect(draftFromTransaction(exchange)).toMatchObject({
      kind: 'transfer',
      fromAccountId: 'pocket',
      toAccountId: 'bank',
      currency: 'USD',
      amountMinor: 10000,
      toCurrency: 'IQD',
      toAmountMinor: 131000,
    });
  });
});

describe('computeBalances', () => {
  it('derives balances per account and currency from lines only', () => {
    const balances = computeBalances([
      { accountId: 'pocket', currency: 'USD', amountMinor: 10000 },
      { accountId: 'pocket', currency: 'USD', amountMinor: -2000 },
      { accountId: 'pocket', currency: 'IQD', amountMinor: 500000 },
      { accountId: 'bank', currency: 'USD', amountMinor: 90000 },
    ]);
    expect(balances.get('pocket')?.get('USD')).toBe(8000);
    expect(balances.get('pocket')?.get('IQD')).toBe(500000);
    expect(balances.get('bank')?.get('USD')).toBe(90000);
    expect(balances.get('bank')?.get('IQD')).toBeUndefined();
  });
});

describe('debts', () => {
  const base = { postedDate: '2026-10-31', note: '' };

  it('lending moves money from your account to the person and sums to zero', () => {
    const result = validateDraft(
      {
        kind: 'debt',
        action: 'lend',
        personId: 'ali',
        accountId: 'pocket',
        currency: 'USD',
        amountMinor: 10000,
        ...base,
      },
      context,
    );
    expect(result).toEqual({
      ok: true,
      kind: 'transfer',
      debtAction: 'lend',
      categoryId: null,
      lines: [
        { accountId: 'pocket', currency: 'USD', amountMinor: -10000, role: 'source' },
        { accountId: 'ali', currency: 'USD', amountMinor: 10000, role: 'destination' },
      ],
    });
    if (result.ok) expect(isBalancedTransfer(result.lines)).toBe(true);
  });

  it('borrowing and collecting move money from the person into your account', () => {
    for (const action of ['borrow', 'collect'] as const) {
      const result = validateDraft(
        {
          kind: 'debt',
          action,
          personId: 'ali',
          accountId: 'bank',
          currency: 'IQD',
          amountMinor: 50000,
          ...base,
        },
        context,
      );
      expect(result.ok && result.lines).toEqual([
        { accountId: 'ali', currency: 'IQD', amountMinor: -50000, role: 'source' },
        { accountId: 'bank', currency: 'IQD', amountMinor: 50000, role: 'destination' },
      ]);
    }
    const repay = validateDraft(
      {
        kind: 'debt',
        action: 'repay',
        personId: 'ali',
        accountId: 'bank',
        currency: 'IQD',
        amountMinor: 50000,
        ...base,
      },
      context,
    );
    expect(repay.ok && repay.lines[1]).toEqual({
      accountId: 'ali',
      currency: 'IQD',
      amountMinor: 50000,
      role: 'destination',
    });
  });

  it('rejects debts that are not between a person and your own account', () => {
    const codes = (draft: Parameters<typeof validateDraft>[0]) => {
      const result = validateDraft(draft, context);
      return result.ok ? [] : result.errors.map((error) => error.code);
    };
    const debt = {
      kind: 'debt' as const,
      action: 'lend' as const,
      currency: 'USD',
      amountMinor: 100,
      ...base,
    };
    expect(codes({ ...debt, personId: 'pocket', accountId: 'bank' })).toContain('not_a_person');
    expect(codes({ ...debt, personId: 'ali', accountId: 'ali' })).toContain('person_not_allowed');
    expect(codes({ ...debt, personId: '', accountId: 'bank' })).toContain('person_required');
    expect(codes({ ...debt, personId: 'ali', accountId: 'bank', amountMinor: 0 })).toContain(
      'amount_not_positive',
    );
    expect(codes({ ...debt, personId: 'ali', accountId: 'bank', currency: 'EUR' })).toContain(
      'currency_unknown',
    );
    expect(
      codes({ ...debt, action: 'gift' as never, personId: 'ali', accountId: 'bank' }),
    ).toContain('debt_action_invalid');
  });

  it('keeps plain transfers between your own accounts only', () => {
    const result = validateDraft(
      {
        kind: 'transfer',
        fromAccountId: 'pocket',
        toAccountId: 'ali',
        currency: 'USD',
        amountMinor: 100,
        ...base,
      },
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map((error) => error.code)).toEqual(['person_not_allowed']);
  });

  it('allows an expense paid by someone else and income they still owe you', () => {
    const paidByAli = validateDraft(
      {
        kind: 'expense',
        accountId: 'ali',
        currency: 'USD',
        amountMinor: 2500,
        categoryId: 'food',
        ...base,
      },
      context,
    );
    expect(paidByAli.ok && paidByAli.lines[0]).toEqual({
      accountId: 'ali',
      currency: 'USD',
      amountMinor: -2500,
      role: 'main',
    });
    const owedToYou = validateDraft(
      {
        kind: 'income',
        accountId: 'ali',
        currency: 'USD',
        amountMinor: 7000,
        categoryId: 'salary',
        ...base,
      },
      context,
    );
    expect(owedToYou.ok && owedToYou.kind).toBe('income');
  });

  it('round-trips a stored debt back into an editable draft', () => {
    const stored: TransactionWithLines = {
      id: 't9',
      kind: 'transfer',
      debtAction: 'borrow',
      postedDate: '2026-10-20',
      categoryId: null,
      note: 'Car repair',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      lines: [
        {
          id: 'a',
          transactionId: 't9',
          accountId: 'ali',
          currency: 'USD',
          amountMinor: -30000,
          role: 'source',
        },
        {
          id: 'b',
          transactionId: 't9',
          accountId: 'bank',
          currency: 'USD',
          amountMinor: 30000,
          role: 'destination',
        },
      ],
    };
    expect(draftFromTransaction(stored)).toEqual({
      kind: 'debt',
      action: 'borrow',
      personId: 'ali',
      accountId: 'bank',
      currency: 'USD',
      amountMinor: 30000,
      postedDate: '2026-10-20',
      note: 'Car repair',
    });
  });
});
