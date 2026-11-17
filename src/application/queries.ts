import type { BalanceRow, EntryKind, Receipt, Repositories } from '@/data';
import {
  type Account,
  type Budget,
  budgetProgress,
  type BudgetProgress,
  buildStatement,
  type Category,
  currentYearMonth,
  compareByAttention,
  type DebtTotals,
  daysInMonth,
  getCurrency,
  type CurrencyCode,
  type ExchangeQuote,
  expenseTotalsByCurrency,
  type IsoDate,
  type MinorUnits,
  monthlyTotals,
  type MonthlyTotal,
  monthRange,
  type PeriodSummary,
  quoteFromAmounts,
  type ReportLine,
  shiftYearMonth,
  type Statement,
  suggestBudget,
  suggestionWindow,
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
  /** The account last used for each kind of entry, used as the form's default. */
  lastAccountIds: Partial<Record<EntryKind, string>>;
  /** The rate of the most recent exchange between the two current currencies, if any. */
  lastExchangeRate: ExchangeQuote | null;
  pendingReceipts: number;
  today: IsoDate;
  /** True once the ledger is a week old and the last backup is more than 30 days old. */
  backupDue: boolean;
  /** Every budget with this month's progress, the overall ones first. */
  budgets: BudgetLine[];
};

/** One budget with how this month is going against it. */
export type BudgetLine = {
  budget: Budget;
  /** Null for the budget that covers all expenses. */
  category: Category | null;
  progress: BudgetProgress;
};

export type BudgetOverviewRow = {
  /** Null for all expenses. */
  category: Category | null;
  budget: Budget | null;
  spentMinor: MinorUnits;
  progress: BudgetProgress | null;
  /** A budget based on recent spending, offered when setting one. */
  suggestionMinor: MinorUnits | null;
};

export type BudgetOverview = {
  month: YearMonth;
  currency: CurrencyCode;
  today: IsoDate;
  overall: BudgetOverviewRow;
  /** Every active expense category, budgeted or not. */
  categories: BudgetOverviewRow[];
  /** What the category budgets add up to. */
  categoryBudgetsMinor: MinorUnits;
  /** How many days of history the suggestions are based on; 0 when there is too little. */
  suggestionDays: number;
};

/**
 * Pairs each budget with this month's spending: all expenses for the overall
 * budget, the category's own share for a category budget. Most urgent first,
 * with the overall budget for each currency ahead of its categories.
 */
export function budgetLines(
  budgets: readonly Budget[],
  categories: readonly Category[],
  lines: readonly ReportLine[],
  month: YearMonth,
  today: IsoDate,
): BudgetLine[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const summaries = new Map<CurrencyCode, PeriodSummary>();
  const summaryFor = (currency: CurrencyCode) => {
    const known = summaries.get(currency);
    if (known) return known;
    const summary = summarizePeriod(lines, currency);
    summaries.set(currency, summary);
    return summary;
  };
  const result: BudgetLine[] = [];
  for (const budget of budgets) {
    const category = budget.categoryId ? byId.get(budget.categoryId) : null;
    // A budget for a category that is archived or gone no longer applies.
    if (category === undefined || category?.archivedAt) continue;
    const summary = summaryFor(budget.currency);
    const spent = category
      ? (summary.expenseByCategory.find((item) => item.categoryId === category.id)?.total ?? 0)
      : summary.expense;
    result.push({
      budget,
      category,
      progress: budgetProgress(budget.amountMinor, spent, month, today),
    });
  }
  return result.sort(
    (a, b) =>
      Number(a.category !== null) - Number(b.category !== null) ||
      compareByAttention(a.progress, b.progress),
  );
}

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
        lastAccountIds,
        lastExchange,
        budgets,
      ] = await Promise.all([
        repos.settings.getAll(),
        repos.accounts.list({ includeArchived: true }),
        repos.categories.list(),
        repos.reports.balances(),
        repos.reports.reportLines(month.start, month.end),
        repos.transactions.list({ limit: 8 }),
        repos.receipts.countPending(),
        repos.transactions.lastAccountByEntryKind(),
        repos.transactions.lastExchange(),
        repos.budgets.list(),
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
        lastAccountIds,
        lastExchangeRate:
          lastExchange &&
          settings.currencies.includes(lastExchange.fromCurrency) &&
          settings.currencies.includes(lastExchange.toCurrency)
            ? quoteFromAmounts(
                lastExchange.fromMinor,
                lastExchange.fromCurrency,
                lastExchange.toMinor,
                lastExchange.toCurrency,
              )
            : null,
        pendingReceipts,
        today,
        backupDue: isBackupDue(accounts, settings.lastBackupAt, now()),
        budgets: budgetLines(
          budgets.filter((budget) => settings.currencies.includes(budget.currency)),
          categories,
          monthLines,
          currentYearMonth(now()),
          today,
        ),
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

    /**
     * Every expense category with its budget, if any, and how the month is going,
     * plus the budget for all expenses. Suggestions come from recent spending.
     */
    async budgetOverview(month: YearMonth, currency: CurrencyCode): Promise<BudgetOverview> {
      const today = todayIsoDate(now());
      const range = monthRange(month);
      const [categories, budgets, monthLines, firstDate] = await Promise.all([
        repos.categories.list(),
        repos.budgets.list({ currency }),
        repos.reports.reportLines(range.start, range.end),
        repos.transactions.firstPostedDate(),
      ]);
      const window = suggestionWindow(firstDate, today);
      const windowLines = window ? await repos.reports.reportLines(window.from, window.to) : [];
      const windowSummary = summarizePeriod(windowLines, currency);
      const summary = summarizePeriod(monthLines, currency);
      const monthDays = daysInMonth(month.year, month.month);
      const digits = getCurrency(currency).fractionDigits;
      const suggest = (spent: MinorUnits) =>
        window ? suggestBudget(spent, window.days, monthDays, digits) : null;
      const row = (category: Category | null): BudgetOverviewRow => {
        const budget =
          budgets.find((item) => item.categoryId === (category ? category.id : null)) ?? null;
        const spentMinor = category
          ? (summary.expenseByCategory.find((item) => item.categoryId === category.id)?.total ?? 0)
          : summary.expense;
        const recent = category
          ? (windowSummary.expenseByCategory.find((item) => item.categoryId === category.id)
              ?.total ?? 0)
          : windowSummary.expense;
        return {
          category,
          budget,
          spentMinor,
          progress: budget ? budgetProgress(budget.amountMinor, spentMinor, month, today) : null,
          suggestionMinor: suggest(recent),
        };
      };
      const expenseCategories = categories.filter(
        (category) => category.kind === 'expense' && !category.archivedAt,
      );
      const categoryRows = expenseCategories.map(row);
      return {
        month,
        currency,
        today,
        overall: row(null),
        // Budgeted categories first, most urgent at the top; then the rest by spending.
        categories: categoryRows.sort((a, b) => {
          if (a.progress && b.progress) return compareByAttention(a.progress, b.progress);
          if (a.progress || b.progress) return a.progress ? -1 : 1;
          return b.spentMinor - a.spentMinor;
        }),
        categoryBudgetsMinor: categoryRows.reduce(
          (sum, item) => sum + (item.budget?.amountMinor ?? 0),
          0,
        ),
        suggestionDays: window?.days ?? 0,
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
