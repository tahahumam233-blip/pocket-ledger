import type { BalanceRow, Receipt, Repositories } from '@/data';
import {
  type Account,
  type Category,
  currentYearMonth,
  type CurrencyCode,
  expenseTotalsByCurrency,
  type IsoDate,
  type MinorUnits,
  monthlyTotals,
  type MonthlyTotal,
  monthRange,
  type PeriodSummary,
  type ReportLine,
  shiftYearMonth,
  summarizePeriod,
  todayIsoDate,
  type TransactionWithLines,
  type YearMonth,
} from '@/domain';

import type { Clock } from './ports';
import { type AppSettings, parseSettings } from './settings';

export type AccountBalances = {
  account: Account;
  balances: Partial<Record<CurrencyCode, MinorUnits>>;
};

export type HomeSnapshot = {
  settings: AppSettings;
  accounts: Account[];
  categories: Category[];
  accountBalances: AccountBalances[];
  /** Net worth per currency across all active accounts. */
  totals: Partial<Record<CurrencyCode, MinorUnits>>;
  spentToday: Partial<Record<CurrencyCode, MinorUnits>>;
  spentThisMonth: Partial<Record<CurrencyCode, MinorUnits>>;
  recentTransactions: TransactionWithLines[];
  pendingReceipts: number;
  today: IsoDate;
};

export type MonthReport = {
  month: YearMonth;
  currency: CurrencyCode;
  summary: PeriodSummary;
  trend: MonthlyTotal[];
  previous: PeriodSummary;
};

function groupBalances(accounts: Account[], rows: BalanceRow[]): AccountBalances[] {
  return accounts.map((account) => {
    const balances: Partial<Record<CurrencyCode, MinorUnits>> = {};
    for (const row of rows) {
      if (row.accountId === account.id) balances[row.currency] = row.balanceMinor;
    }
    return { account, balances };
  });
}

function totalsFor(accountBalances: AccountBalances[], currencies: CurrencyCode[]) {
  const totals: Partial<Record<CurrencyCode, MinorUnits>> = {};
  for (const currency of currencies) totals[currency] = 0;
  for (const entry of accountBalances) {
    if (entry.account.archivedAt) continue;
    for (const [currency, amount] of Object.entries(entry.balances)) {
      totals[currency] = (totals[currency] ?? 0) + (amount ?? 0);
    }
  }
  return totals;
}

function toRecord(map: Map<CurrencyCode, MinorUnits>): Partial<Record<CurrencyCode, MinorUnits>> {
  const record: Partial<Record<CurrencyCode, MinorUnits>> = {};
  for (const [currency, amount] of map) record[currency] = amount;
  return record;
}

export function createQueries(repos: Repositories, clock?: Clock) {
  const now = () => clock?.now() ?? new Date();

  return {
    async settings(): Promise<AppSettings> {
      return parseSettings(await repos.settings.getAll());
    },

    async home(): Promise<HomeSnapshot> {
      const today = todayIsoDate(now());
      const month = monthRange(currentYearMonth(now()));
      const [
        settingsRecord,
        accounts,
        categories,
        balanceRows,
        monthLines,
        recent,
        pendingReceipts,
      ] = await Promise.all([
        repos.settings.getAll(),
        repos.accounts.list(),
        repos.categories.list(),
        repos.reports.balances(),
        repos.reports.reportLines(month.start, month.end),
        repos.transactions.list({ limit: 8 }),
        repos.receipts.countPending(),
      ]);
      const settings = parseSettings(settingsRecord);
      const accountBalances = groupBalances(accounts, balanceRows);
      const todayLines = monthLines.filter((line) => line.postedDate === today);
      return {
        settings,
        accounts,
        categories,
        accountBalances,
        totals: totalsFor(accountBalances, settings.currencies),
        spentToday: toRecord(expenseTotalsByCurrency(todayLines)),
        spentThisMonth: toRecord(expenseTotalsByCurrency(monthLines)),
        recentTransactions: recent,
        pendingReceipts,
        today,
      };
    },

    async monthReport(month: YearMonth, currency: CurrencyCode): Promise<MonthReport> {
      const range = monthRange(month);
      const previousMonth = shiftYearMonth(month, -1);
      const trendMonths = [5, 4, 3, 2, 1, 0].map((delta) => shiftYearMonth(month, -delta));
      const trendStart = monthRange(trendMonths[0] ?? month).start;
      const lines: ReportLine[] = await repos.reports.reportLines(trendStart, range.end);
      const monthLines = lines.filter(
        (line) => line.postedDate >= range.start && line.postedDate <= range.end,
      );
      const previousRange = monthRange(previousMonth);
      const previousLines = lines.filter(
        (line) => line.postedDate >= previousRange.start && line.postedDate <= previousRange.end,
      );
      return {
        month,
        currency,
        summary: summarizePeriod(monthLines, currency),
        previous: summarizePeriod(previousLines, currency),
        trend: monthlyTotals(lines, trendMonths, currency),
      };
    },

    async transactions(filter: Parameters<Repositories['transactions']['list']>[0]) {
      return repos.transactions.list(filter);
    },

    async receiptsInbox(): Promise<{ pending: Receipt[]; done: Receipt[] }> {
      const [pending, done] = await Promise.all([
        repos.receipts.list('pending'),
        repos.receipts.list('linked', 60),
      ]);
      return { pending, done };
    },
  };
}

export type Queries = ReturnType<typeof createQueries>;
