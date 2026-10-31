import type { CurrencyCode } from './currency';
import { type IsoDate, monthKey, type YearMonth, yearMonthOf } from './dates';
import type { TransactionKind } from './ledger';
import type { MinorUnits } from './money';

/** A flattened active ledger line with the fields reports need. */
export type ReportLine = {
  transactionId: string;
  kind: TransactionKind;
  categoryId: string | null;
  accountId: string;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  postedDate: IsoDate;
};

export type CategoryTotal = {
  categoryId: string | null;
  total: MinorUnits;
  count: number;
  /** Share of the period's total for this kind, between 0 and 1. */
  share: number;
};

export type PeriodSummary = {
  currency: CurrencyCode;
  income: MinorUnits;
  expense: MinorUnits;
  net: MinorUnits;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  expenseByDay: Map<IsoDate, MinorUnits>;
  expenseCount: number;
  incomeCount: number;
};

/**
 * Reports only count income and expense transactions. Transfers, exchanges,
 * opening balances and adjustments move money between places but are neither
 * earned nor spent, so they are excluded here.
 */
export function isReportable(kind: TransactionKind): boolean {
  return kind === 'expense' || kind === 'income';
}

function categoryTotals(lines: ReportLine[], sign: 1 | -1): CategoryTotal[] {
  const totals = new Map<string | null, { total: MinorUnits; count: number }>();
  let grand = 0;
  for (const line of lines) {
    const magnitude = sign * line.amountMinor;
    grand += magnitude;
    const entry = totals.get(line.categoryId) ?? { total: 0, count: 0 };
    entry.total += magnitude;
    entry.count += 1;
    totals.set(line.categoryId, entry);
  }
  return [...totals.entries()]
    .map(([categoryId, entry]) => ({
      categoryId,
      total: entry.total,
      count: entry.count,
      share: grand === 0 ? 0 : entry.total / grand,
    }))
    .sort((a, b) => b.total - a.total);
}

export function summarizePeriod(
  lines: readonly ReportLine[],
  currency: CurrencyCode,
): PeriodSummary {
  const relevant = lines.filter((line) => line.currency === currency && isReportable(line.kind));
  const expenses = relevant.filter((line) => line.kind === 'expense');
  const incomes = relevant.filter((line) => line.kind === 'income');

  const expense = expenses.reduce((sum, line) => sum - line.amountMinor, 0);
  const income = incomes.reduce((sum, line) => sum + line.amountMinor, 0);

  const expenseByDay = new Map<IsoDate, MinorUnits>();
  for (const line of expenses) {
    expenseByDay.set(line.postedDate, (expenseByDay.get(line.postedDate) ?? 0) - line.amountMinor);
  }

  return {
    currency,
    income,
    expense,
    net: income - expense,
    expenseByCategory: categoryTotals(expenses, -1),
    incomeByCategory: categoryTotals(incomes, 1),
    expenseByDay,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
  };
}

export type MonthlyTotal = {
  month: YearMonth;
  key: string;
  income: MinorUnits;
  expense: MinorUnits;
};

/** Income and expense per month for a list of months, in the given currency. */
export function monthlyTotals(
  lines: readonly ReportLine[],
  months: readonly YearMonth[],
  currency: CurrencyCode,
): MonthlyTotal[] {
  const buckets = new Map<string, MonthlyTotal>();
  for (const month of months) {
    const key = monthKey(month);
    buckets.set(key, { month, key, income: 0, expense: 0 });
  }
  for (const line of lines) {
    if (line.currency !== currency || !isReportable(line.kind)) continue;
    const bucket = buckets.get(monthKey(yearMonthOf(line.postedDate)));
    if (!bucket) continue;
    if (line.kind === 'expense') bucket.expense -= line.amountMinor;
    else bucket.income += line.amountMinor;
  }
  return [...buckets.values()];
}

/** Total spent per currency in a set of lines (used for "today" and "this month" tiles). */
export function expenseTotalsByCurrency(
  lines: readonly ReportLine[],
): Map<CurrencyCode, MinorUnits> {
  const totals = new Map<CurrencyCode, MinorUnits>();
  for (const line of lines) {
    if (line.kind !== 'expense') continue;
    totals.set(line.currency, (totals.get(line.currency) ?? 0) - line.amountMinor);
  }
  return totals;
}
