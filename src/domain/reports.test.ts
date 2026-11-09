import { describe, expect, it } from '@jest/globals';

import {
  expenseTotalsByCurrency,
  monthlyTotals,
  type ReportLine,
  summarizePeriod,
} from './reports';

const line = (
  overrides: Partial<ReportLine> & Pick<ReportLine, 'kind' | 'amountMinor'>,
): ReportLine => ({
  transactionId: 't',
  categoryId: 'food',
  accountId: 'pocket',
  currency: 'USD',
  postedDate: '2026-10-10',
  ...overrides,
});

describe('summarizePeriod', () => {
  const lines: ReportLine[] = [
    line({
      transactionId: 'e1',
      kind: 'expense',
      amountMinor: -1000,
      categoryId: 'food',
      postedDate: '2026-10-01',
    }),
    line({
      transactionId: 'e2',
      kind: 'expense',
      amountMinor: -3000,
      categoryId: 'food',
      postedDate: '2026-10-02',
    }),
    line({
      transactionId: 'e3',
      kind: 'expense',
      amountMinor: -6000,
      categoryId: 'rent',
      postedDate: '2026-10-02',
    }),
    line({ transactionId: 'i1', kind: 'income', amountMinor: 50000, categoryId: 'salary' }),
    line({ kind: 'transfer', amountMinor: -20000, categoryId: null }),
    line({ kind: 'transfer', amountMinor: 20000, categoryId: null }),
    line({ kind: 'opening', amountMinor: 99999, categoryId: null }),
    line({ kind: 'adjustment', amountMinor: -777, categoryId: null }),
    line({ kind: 'expense', amountMinor: -250000, currency: 'IQD', categoryId: 'food' }),
  ];

  it('counts only income and expenses in the requested currency', () => {
    const summary = summarizePeriod(lines, 'USD');
    expect(summary.expense).toBe(10000);
    expect(summary.income).toBe(50000);
    expect(summary.net).toBe(40000);
    expect(summary.expenseCount).toBe(3);
    expect(summary.incomeCount).toBe(1);
  });

  it('never mixes currencies', () => {
    expect(summarizePeriod(lines, 'IQD').expense).toBe(250000);
    expect(summarizePeriod(lines, 'IQD').income).toBe(0);
  });

  it('counts a split expense once and only your share as spending', () => {
    // $30 paid from Bank: $18 of it was a colleague's order, receivable from them.
    const split: ReportLine[] = [
      line({ transactionId: 's1', kind: 'expense', amountMinor: -3000, accountId: 'bank' }),
      line({ transactionId: 's1', kind: 'expense', amountMinor: 1800, accountId: 'ali' }),
    ];
    const summary = summarizePeriod(split, 'USD');
    expect(summary.expense).toBe(1200);
    expect(summary.expenseCount).toBe(1);
    expect(summary.expenseByCategory).toEqual([
      { categoryId: 'food', total: 1200, count: 1, share: 1 },
    ]);
    expect(expenseTotalsByCurrency(split).get('USD')).toBe(1200);
  });

  it('ranks categories with shares and groups spending by day', () => {
    const summary = summarizePeriod(lines, 'USD');
    expect(summary.expenseByCategory).toEqual([
      { categoryId: 'rent', total: 6000, count: 1, share: 0.6 },
      { categoryId: 'food', total: 4000, count: 2, share: 0.4 },
    ]);
    expect(summary.expenseByDay.get('2026-10-02')).toBe(9000);
    expect(summary.expenseByDay.get('2026-10-01')).toBe(1000);
  });

  it('builds monthly trends and per-currency expense totals', () => {
    const months = [
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ];
    const trend = monthlyTotals(
      [...lines, line({ kind: 'expense', amountMinor: -500, postedDate: '2026-09-15' })],
      months,
      'USD',
    );
    expect(trend.map((bucket) => bucket.expense)).toEqual([500, 10000]);
    expect(trend[1]?.income).toBe(50000);

    const totals = expenseTotalsByCurrency(lines);
    expect(totals.get('USD')).toBe(10000);
    expect(totals.get('IQD')).toBe(250000);
  });
});
