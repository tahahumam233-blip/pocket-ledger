import type { CurrencyCode } from './currency';
import { addDays, daysInMonth, type IsoDate, monthRange, type YearMonth } from './dates';
import type { MinorUnits } from './money';

/**
 * A monthly spending limit in one currency, for one expense category or, with
 * no category, for all expenses together. The same limit applies every month
 * and spending starts again from zero on the 1st.
 */
export type Budget = {
  id: string;
  /** Null for the budget that covers all expenses. */
  categoryId: string | null;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  createdAt: string;
  updatedAt: string;
};

/**
 * - on_track: spending is at or below an even pace through the month
 * - ahead: more than an even pace so far, but still within the budget
 * - over: more than the budget
 */
export type BudgetStatus = 'on_track' | 'ahead' | 'over';

export const BUDGET_STATUS_TEXT: Record<BudgetStatus, string> = {
  on_track: 'On track',
  ahead: 'Ahead of pace',
  over: 'Over budget',
};

export type BudgetProgress = {
  budgetMinor: MinorUnits;
  spentMinor: MinorUnits;
  /** Budget minus spending; negative once over budget. */
  remainingMinor: MinorUnits;
  /** Spending as a share of the budget: 0.5 is half spent, 1.2 is 20% over. */
  ratio: number;
  /** What an even pace would have spent by the end of today. */
  expectedMinor: MinorUnits;
  status: BudgetStatus;
  daysInMonth: number;
  /** Days still to come in the month, counting today; 0 for a past month. */
  daysLeft: number;
  /** What can still be spent each day to stay within budget; null when no days are left. */
  perDayLeftMinor: MinorUnits | null;
  /** Spending by the end of the month if the pace so far continues. */
  projectedMinor: MinorUnits;
};

/** How many days of the month have passed, counting today: 0 before it starts. */
export function daysElapsed(month: YearMonth, today: IsoDate): number {
  const { start, end } = monthRange(month);
  if (today < start) return 0;
  if (today > end) return daysInMonth(month.year, month.month);
  return Number(today.slice(8, 10));
}

export function budgetProgress(
  budgetMinor: MinorUnits,
  spentMinor: MinorUnits,
  month: YearMonth,
  today: IsoDate,
): BudgetProgress {
  const days = daysInMonth(month.year, month.month);
  const elapsed = daysElapsed(month, today);
  const { start, end } = monthRange(month);
  // Today still counts as a day to spend in.
  const daysLeft = today < start ? days : today > end ? 0 : days - elapsed + 1;
  const remainingMinor = budgetMinor - spentMinor;
  const expectedMinor = Math.floor((budgetMinor * elapsed) / days);
  const status: BudgetStatus =
    spentMinor > budgetMinor ? 'over' : spentMinor > expectedMinor ? 'ahead' : 'on_track';
  return {
    budgetMinor,
    spentMinor,
    remainingMinor,
    ratio: budgetMinor > 0 ? spentMinor / budgetMinor : 0,
    expectedMinor,
    status,
    daysInMonth: days,
    daysLeft,
    perDayLeftMinor: daysLeft > 0 ? Math.floor(Math.max(remainingMinor, 0) / daysLeft) : null,
    projectedMinor: elapsed > 0 ? Math.round((spentMinor * days) / elapsed) : spentMinor,
  };
}

/**
 * Rounds up to two significant figures of whole units, so a suggested budget
 * reads like one a person would choose: 444,977 becomes 450,000.
 */
export function roundUpNice(minor: MinorUnits, fractionDigits: number): MinorUnits {
  if (minor <= 0) return 0;
  const unit = 10 ** fractionDigits;
  const wholeDigits = String(Math.ceil(minor / unit)).length;
  const step = 10 ** Math.max(wholeDigits - 2, 0) * unit;
  return Math.ceil(minor / step) * step;
}

/** Shortest history worth suggesting a budget from. */
export const SUGGESTION_MIN_DAYS = 7;
/** How far back suggestions look. */
export const SUGGESTION_WINDOW_DAYS = 90;

/** The days a suggestion is based on: up to 90 days back, from the first entry, to today. */
export function suggestionWindow(
  firstEntryDate: IsoDate | null,
  today: IsoDate,
): { from: IsoDate; to: IsoDate; days: number } | null {
  if (!firstEntryDate || firstEntryDate > today) return null;
  const earliest = addDays(today, -(SUGGESTION_WINDOW_DAYS - 1));
  const from = firstEntryDate > earliest ? firstEntryDate : earliest;
  const days =
    Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) +
    1;
  return days >= SUGGESTION_MIN_DAYS ? { from, to: today, days } : null;
}

/**
 * A budget for a month of the given length from what was spent over a window
 * of days: the daily average times the month's days, rounded up to a round number.
 */
export function suggestBudget(
  spentInWindowMinor: MinorUnits,
  windowDays: number,
  monthDays: number,
  fractionDigits: number,
): MinorUnits | null {
  if (windowDays < SUGGESTION_MIN_DAYS || spentInWindowMinor <= 0) return null;
  return roundUpNice(Math.round((spentInWindowMinor * monthDays) / windowDays), fractionDigits);
}

/** Over budget first, then the fullest, so the budgets that need attention lead. */
export function compareByAttention(a: BudgetProgress, b: BudgetProgress): number {
  const weight = (progress: BudgetProgress) =>
    progress.status === 'over' ? 2 : progress.status === 'ahead' ? 1 : 0;
  return weight(b) - weight(a) || b.ratio - a.ratio;
}
