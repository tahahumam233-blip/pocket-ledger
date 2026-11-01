import type { BalanceRow, Receipt, Repositories } from '@/data';
import {
  type Account,
  buildStatement,
  type Category,
  currentYearMonth,
  type DebtTotals,
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
  type Statement,
  summarizeDebts,
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
  /** Active money accounts (safe, pocket, bank…). */
  accounts: Account[];
  /** Active people you lend to or borrow from. */
  people: Account[];
  /** Every account including people and archived ones, for naming old entries. */
  allAccounts: Account[];
  categories: Category[];
  accountBalances: AccountBalances[];
  peopleBalances: AccountBalances[];
  /** What people owe you and what you owe them, per currency. */
  debts: DebtTotals;
  /** Money you hold per currency across active money accounts. Debts are not included. */
  totals: Partial<Record<CurrencyCode, MinorUnits>>;
  spentToday: Partial<Record<CurrencyCode, MinorUnits>>;
  spentThisMonth: Partial<Record<CurrencyCode, MinorUnits>>;
  recentTransactions: TransactionWithLines[];
  pendingReceipts: number;
  today: IsoDate;
  /** True once the ledger is a week old and the last backup is more than 30 days old. */
  backupDue: boolean;
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

const DAY_MS = 24 * 60 * 60 * 1000;

export function isBackupDue(accounts: Account[], lastBackupAt: string, now: Date): boolean {
  if (accounts.length === 0) return false;
  const firstUse = Math.min(...accounts.map((account) => Date.parse(account.createdAt)));
  const lastBackup = lastBackupAt ? Date.parse(lastBackupAt) : 0;
  return now.getTime() - firstUse > 7 * DAY_MS && now.getTime() - lastBackup > 30 * DAY_MS;
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
        allAccounts,
        categories,
        balanceRows,
        monthLines,
        recent,
        pendingReceipts,
      ] = await Promise.all([
        repos.settings.getAll(),
        repos.accounts.list({ includeArchived: true }),
        repos.categories.list(),
        repos.reports.balances(),
        repos.reports.reportLines(month.start, month.end),
        repos.transactions.list({ limit: 8 }),
        repos.receipts.countPending(),
      ]);
      const settings = parseSettings(settingsRecord);
      const accounts = allAccounts.filter(
        (account) => account.accountClass === 'money' && !account.archivedAt,
      );
      const people = allAccounts.filter(
        (account) => account.accountClass === 'person' && !account.archivedAt,
      );
      const accountBalances = groupBalances(accounts, balanceRows);
      const peopleBalances = groupBalances(people, balanceRows);
      const todayLines = monthLines.filter((line) => line.postedDate === today);
      return {
        settings,
        accounts,
        people,
        allAccounts,
        categories,
        accountBalances,
        peopleBalances,
        debts: summarizeDebts(peopleBalances),
        totals: totalsFor(accountBalances, settings.currencies),
        spentToday: toRecord(expenseTotalsByCurrency(todayLines)),
        spentThisMonth: toRecord(expenseTotalsByCurrency(monthLines)),
        recentTransactions: recent,
        pendingReceipts,
        today,
        backupDue: isBackupDue(accounts, settings.lastBackupAt, now()),
      };
    },

    /** People with their balances; archived people only when asked. */
    async people(options: { includeArchived?: boolean } = {}): Promise<AccountBalances[]> {
      const [people, balanceRows] = await Promise.all([
        repos.accounts.list({ accountClass: 'person', includeArchived: options.includeArchived }),
        repos.reports.balances(),
      ]);
      return groupBalances(people, balanceRows);
    },

    /** Statement of account for one person and currency over an optional date range. */
    async personStatement(
      personId: string,
      currency: CurrencyCode,
      range: { from?: IsoDate | null; to?: IsoDate | null } = {},
    ): Promise<Statement> {
      const lines = await repos.reports.statementLines(personId, currency);
      return buildStatement(lines, currency, range);
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
