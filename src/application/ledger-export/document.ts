import {
  type Account,
  type Budget,
  BUDGET_STATUS_TEXT,
  budgetProgress,
  type Category,
  type CurrencyCode,
  DEBT_ACTION_INFO,
  debtGoesToPerson,
  describeRate,
  formatShortDate,
  type IsoDate,
  type LedgerLine,
  type MinorUnits,
  quoteFromAmounts,
  type TransactionWithLines,
  yearMonthOf,
} from '@/domain';

/**
 * The kinds of account a journal line can sit on. Cash & bank and Party are the
 * ledger's real accounts; the others are the opposite side of an entry, added
 * here so every entry balances the way a bookkeeper expects.
 */
export const LEDGER_ACCOUNT_CLASSES = [
  'Cash & bank',
  'Party',
  'Income',
  'Expense',
  'Opening balances',
  'Reconciliation',
  'Currency exchange',
] as const;
export type LedgerAccountClass = (typeof LEDGER_ACCOUNT_CLASSES)[number];

type Amounts = Partial<Record<CurrencyCode, MinorUnits>>;

/** One row per entry, with everything needed to understand it on its own. */
export type LedgerEntryRow = {
  number: number;
  id: string;
  date: IsoDate;
  type: string;
  description: string;
  category: string;
  /** Your cash or bank account: paid from, received into, or the source of a transfer. */
  account: string;
  /** Where a transfer or exchange went. */
  toAccount: string;
  /** Parties involved, comma separated. */
  party: string;
  currency: CurrencyCode;
  /** The entry's headline amount, always positive. */
  amountMinor: MinorUnits;
  /** Net change to your cash and bank accounts in `currency`. */
  cashChangeMinor: MinorUnits;
  /** Net change to party balances in `currency`: positive raises what is receivable. */
  partyChangeMinor: MinorUnits;
  /** The part that counts as income in reports. */
  incomeMinor: MinorUnits;
  /** The part that counts as an expense in reports (your own share of a split). */
  expenseMinor: MinorUnits;
  /** For an exchange: what was received. */
  receivedCurrency: CurrencyCode | '';
  receivedMinor: MinorUnits;
  /** For an exchange, such as "1 USD = 1,310 IQD". */
  rate: string;
  note: string;
  receipts: number;
  recordedAt: string;
};

/** One debit or credit line of the general journal. */
export type LedgerJournalRow = {
  entryNumber: number;
  entryId: string;
  date: IsoDate;
  type: string;
  description: string;
  account: string;
  accountClass: LedgerAccountClass;
  currency: CurrencyCode;
  debitMinor: MinorUnits;
  creditMinor: MinorUnits;
  category: string;
  party: string;
  note: string;
  receipts: number;
  recordedAt: string;
};

export type LedgerTrialRow = {
  currency: CurrencyCode;
  account: string;
  accountClass: LedgerAccountClass;
  debitMinor: MinorUnits;
  creditMinor: MinorUnits;
};

export type LedgerAccountRow = { name: string; kind: string; archived: boolean; balances: Amounts };

export type LedgerPartyRow = {
  name: string;
  note: string;
  dueDate: IsoDate | null;
  archived: boolean;
  /** Positive is receivable from the party, negative is payable to them. */
  balances: Amounts;
};

export type LedgerCategoryRow = {
  name: string;
  kind: 'Expense' | 'Income';
  archived: boolean;
  entries: number;
  totals: Amounts;
};

/** A monthly budget measured against the month the file was exported in. */
export type LedgerBudgetRow = {
  /** "All expenses" or the category's name. */
  scope: string;
  currency: CurrencyCode;
  budgetMinor: MinorUnits;
  spentMinor: MinorUnits;
  /** Negative when spending went over the budget. */
  remainingMinor: MinorUnits;
  status: string;
};

export type LedgerMonthRow = {
  /** First day of the month. */
  month: IsoDate;
  currency: CurrencyCode;
  incomeMinor: MinorUnits;
  expenseMinor: MinorUnits;
};

/**
 * The whole ledger laid out for reading outside the app: every entry, a
 * balanced journal, a trial balance and the usual summaries.
 */
export type LedgerExportDocument = {
  appName: string;
  exportedOn: IsoDate;
  /** For example "Prepared 16 Nov 2026 by Taha". */
  preparedLabel: string;
  /** The ledger's currencies first, then any other currency found in old entries. */
  currencies: CurrencyCode[];
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
  entries: LedgerEntryRow[];
  journal: LedgerJournalRow[];
  trialBalance: LedgerTrialRow[];
  accounts: LedgerAccountRow[];
  parties: LedgerPartyRow[];
  categories: LedgerCategoryRow[];
  monthly: LedgerMonthRow[];
  /** First day of the month the budgets are measured in: the export month. */
  budgetMonth: IsoDate;
  budgets: LedgerBudgetRow[];
  totals: { cash: Amounts; receivables: Amounts; payables: Amounts };
  fileBaseName: string;
};

export type LedgerExportInput = {
  appName: string;
  exportedOn: IsoDate;
  preparedBy?: string;
  currencies: readonly CurrencyCode[];
  /** Every account and party, including archived ones. */
  accounts: readonly Account[];
  categories: readonly Category[];
  /** Entries that count; deleted ones are left out by the caller or here. */
  transactions: readonly TransactionWithLines[];
  receiptCounts: ReadonlyMap<string, number>;
  /** Monthly budgets; those on archived categories are left out. */
  budgets?: readonly Budget[];
};

const TYPE_LABELS = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  opening: 'Opening balance',
  adjustment: 'Reconciliation adjustment',
} as const;

const DEBT_PHRASES = {
  lend: (name: string) => `Loan given to ${name}`,
  borrow: (name: string) => `Loan received from ${name}`,
  collect: (name: string) => `Repayment received from ${name}`,
  repay: (name: string) => `Repayment made to ${name}`,
} as const;

function add(target: Amounts, currency: CurrencyCode, amount: MinorUnits): void {
  target[currency] = (target[currency] ?? 0) + amount;
}

function sumIn(lines: readonly LedgerLine[], currency: CurrencyCode): MinorUnits {
  return lines.reduce(
    (sum, line) => (line.currency === currency ? sum + line.amountMinor : sum),
    0,
  );
}

function titleCase(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

/** The account on the other side of an entry, for the currency it does not balance in. */
function contraAccount(
  transaction: TransactionWithLines,
  isExchange: boolean,
  categoryName: string,
): { account: string; accountClass: LedgerAccountClass } {
  switch (transaction.kind) {
    case 'expense':
      return { account: `Expense: ${categoryName || 'Uncategorised'}`, accountClass: 'Expense' };
    case 'income':
      return { account: `Income: ${categoryName || 'Uncategorised'}`, accountClass: 'Income' };
    case 'opening':
      return { account: 'Opening balances', accountClass: 'Opening balances' };
    case 'adjustment':
      return { account: 'Reconciliation adjustments', accountClass: 'Reconciliation' };
    default:
      return isExchange
        ? { account: 'Currency exchange', accountClass: 'Currency exchange' }
        : { account: 'Unbalanced transfer', accountClass: 'Reconciliation' };
  }
}

export function buildLedgerExport(input: LedgerExportInput): LedgerExportDocument {
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const nameOf = (accountId: string) => accountById.get(accountId)?.name ?? 'Unknown account';
  const isParty = (accountId: string) => accountById.get(accountId)?.accountClass === 'person';

  const transactions = input.transactions
    .filter((transaction) => !transaction.deletedAt)
    .slice()
    .sort(
      (a, b) =>
        a.postedDate.localeCompare(b.postedDate) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );

  const extraCurrencies = new Set<CurrencyCode>();
  for (const transaction of transactions) {
    for (const line of transaction.lines) {
      if (!input.currencies.includes(line.currency)) extraCurrencies.add(line.currency);
    }
  }
  const currencies = [...input.currencies, ...[...extraCurrencies].sort()];

  const entries: LedgerEntryRow[] = [];
  const journal: LedgerJournalRow[] = [];
  const balances = new Map<string, Amounts>();
  const categoryStats = new Map<string, { entries: number; totals: Amounts }>();
  const months = new Map<string, LedgerMonthRow>();
  const budgetMonth = input.exportedOn.slice(0, 7);
  /** Expenses in the export month by `categoryId|currency`; '' is every category. */
  const monthSpend = new Map<string, MinorUnits>();

  transactions.forEach((transaction, index) => {
    const number = index + 1;
    const { lines } = transaction;
    const main = lines.find((line) => line.role === 'main');
    const source = lines.find((line) => line.role === 'source');
    const destination = lines.find((line) => line.role === 'destination');
    const head = main ?? source ?? lines[0];
    if (!head) return;

    const moneyLines = lines.filter((line) => !isParty(line.accountId));
    const partyLines = lines.filter((line) => isParty(line.accountId));
    const partyNames = [...new Set(partyLines.map((line) => nameOf(line.accountId)))];
    const category = transaction.categoryId
      ? (categoryById.get(transaction.categoryId)?.name ?? '')
      : '';
    const isExchange =
      transaction.kind === 'transfer' &&
      !transaction.debtAction &&
      Boolean(source && destination && source.currency !== destination.currency);
    const quote =
      isExchange && source && destination
        ? quoteFromAmounts(
            source.amountMinor,
            source.currency,
            destination.amountMinor,
            destination.currency,
          )
        : null;
    const rate = quote ? describeRate(quote) : '';

    let type: string = TYPE_LABELS[transaction.kind];
    let description: string;
    let account = '';
    let toAccount = '';
    if (transaction.kind === 'transfer' && transaction.debtAction) {
      const action = transaction.debtAction;
      const moneyLine = debtGoesToPerson(action) ? source : destination;
      type = DEBT_ACTION_INFO[action].label;
      description = DEBT_PHRASES[action](partyNames[0] ?? 'party');
      account = moneyLine ? nameOf(moneyLine.accountId) : '';
    } else if (transaction.kind === 'transfer') {
      type = isExchange ? 'Exchange' : 'Transfer';
      account = source ? nameOf(source.accountId) : '';
      toAccount = destination ? nameOf(destination.accountId) : '';
      description = isExchange
        ? `Exchange at ${rate || 'an unknown rate'}`
        : `${account} to ${toAccount}`;
    } else if (transaction.kind === 'expense' || transaction.kind === 'income') {
      const onParty = isParty(head.accountId);
      account = onParty ? '' : nameOf(head.accountId);
      const sharedWith = lines
        .filter((line) => line !== head && isParty(line.accountId))
        .map((line) => nameOf(line.accountId));
      description = category || type;
      if (onParty) {
        description +=
          transaction.kind === 'expense'
            ? ` (paid by ${nameOf(head.accountId)})`
            : ` (on account from ${nameOf(head.accountId)})`;
      }
      if (sharedWith.length > 0) description += ` (split with ${sharedWith.join(', ')})`;
    } else {
      account = isParty(head.accountId) ? '' : nameOf(head.accountId);
      description = `${type}: ${nameOf(head.accountId)}`;
    }

    const currency = head.currency;
    const net = sumIn(lines, currency);
    const incomeMinor = transaction.kind === 'income' ? net : 0;
    const expenseMinor = transaction.kind === 'expense' ? -net : 0;
    if (expenseMinor !== 0 && transaction.postedDate.startsWith(budgetMonth)) {
      for (const key of [`|${currency}`, `${transaction.categoryId ?? ''}|${currency}`]) {
        monthSpend.set(key, (monthSpend.get(key) ?? 0) + expenseMinor);
      }
    }
    const receipts = input.receiptCounts.get(transaction.id) ?? 0;
    const party = partyNames.join(', ');

    entries.push({
      number,
      id: transaction.id,
      date: transaction.postedDate,
      type,
      description,
      category,
      account,
      toAccount,
      party,
      currency,
      amountMinor: Math.abs(head.amountMinor),
      cashChangeMinor: sumIn(moneyLines, currency),
      partyChangeMinor: sumIn(partyLines, currency),
      incomeMinor,
      expenseMinor,
      receivedCurrency: isExchange && destination ? destination.currency : '',
      receivedMinor: isExchange && destination ? destination.amountMinor : 0,
      rate,
      note: transaction.note,
      receipts,
      recordedAt: transaction.createdAt,
    });

    // Journal: the stored lines, then the other side for each currency that does not balance.
    const shared = {
      entryNumber: number,
      entryId: transaction.id,
      date: transaction.postedDate,
      type,
      description,
      category,
      party,
      note: transaction.note,
      receipts,
      recordedAt: transaction.createdAt,
    };
    const entryLines: LedgerJournalRow[] = lines.map((line) => ({
      ...shared,
      account: nameOf(line.accountId),
      accountClass: isParty(line.accountId) ? 'Party' : 'Cash & bank',
      currency: line.currency,
      debitMinor: Math.max(line.amountMinor, 0),
      creditMinor: Math.max(-line.amountMinor, 0),
    }));
    for (const lineCurrency of [...new Set(lines.map((line) => line.currency))]) {
      const residual = -sumIn(lines, lineCurrency);
      if (residual === 0) continue;
      entryLines.push({
        ...shared,
        ...contraAccount(transaction, isExchange, category),
        currency: lineCurrency,
        debitMinor: Math.max(residual, 0),
        creditMinor: Math.max(-residual, 0),
      });
    }
    // Debits before credits, as a journal is written.
    journal.push(
      ...entryLines.filter((line) => line.debitMinor > 0),
      ...entryLines.filter((line) => line.debitMinor === 0),
    );

    for (const line of lines) {
      const held = balances.get(line.accountId) ?? {};
      add(held, line.currency, line.amountMinor);
      balances.set(line.accountId, held);
    }
    if (transaction.categoryId && (incomeMinor !== 0 || expenseMinor !== 0)) {
      const stats = categoryStats.get(transaction.categoryId) ?? { entries: 0, totals: {} };
      stats.entries += 1;
      add(stats.totals, currency, incomeMinor + expenseMinor);
      categoryStats.set(transaction.categoryId, stats);
    }
    if (incomeMinor !== 0 || expenseMinor !== 0) {
      const month = `${transaction.postedDate.slice(0, 7)}-01`;
      const key = `${month}|${currency}`;
      const row = months.get(key) ?? { month, currency, incomeMinor: 0, expenseMinor: 0 };
      row.incomeMinor += incomeMinor;
      row.expenseMinor += expenseMinor;
      months.set(key, row);
    }
  });

  const currencyOrder = (code: CurrencyCode) => currencies.indexOf(code);
  const byStatusThenOrder = (a: Account, b: Account) =>
    Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name);

  const moneyAccounts = input.accounts
    .filter((account) => account.accountClass !== 'person')
    .slice()
    .sort(byStatusThenOrder);
  const partyAccounts = input.accounts
    .filter((account) => account.accountClass === 'person')
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) ||
        a.name.localeCompare(b.name),
    );

  const totals = { cash: {} as Amounts, receivables: {} as Amounts, payables: {} as Amounts };
  const accounts: LedgerAccountRow[] = moneyAccounts.map((account) => {
    const held = balances.get(account.id) ?? {};
    for (const code of currencies) add(totals.cash, code, held[code] ?? 0);
    return {
      name: account.name,
      kind: titleCase(account.kind),
      archived: Boolean(account.archivedAt),
      balances: held,
    };
  });
  const parties: LedgerPartyRow[] = partyAccounts.map((account) => {
    const held = balances.get(account.id) ?? {};
    for (const code of currencies) {
      const balance = held[code] ?? 0;
      add(totals.receivables, code, Math.max(balance, 0));
      add(totals.payables, code, Math.max(-balance, 0));
    }
    return {
      name: account.name,
      note: account.note,
      dueDate: account.dueDate,
      archived: Boolean(account.archivedAt),
      balances: held,
    };
  });

  const categories: LedgerCategoryRow[] = input.categories
    .slice()
    .sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) ||
        Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) ||
        a.name.localeCompare(b.name),
    )
    .map((category) => ({
      name: category.name,
      kind: category.kind === 'income' ? 'Income' : 'Expense',
      archived: Boolean(category.archivedAt),
      entries: categoryStats.get(category.id)?.entries ?? 0,
      totals: categoryStats.get(category.id)?.totals ?? {},
    }));

  const accountOrder = new Map(moneyAccounts.map((account, index) => [account.name, index]));
  const trial = new Map<string, LedgerTrialRow>();
  for (const line of journal) {
    const key = `${line.currency}|${line.accountClass}|${line.account}`;
    const row = trial.get(key) ?? {
      currency: line.currency,
      account: line.account,
      accountClass: line.accountClass,
      debitMinor: 0,
      creditMinor: 0,
    };
    row.debitMinor += line.debitMinor;
    row.creditMinor += line.creditMinor;
    trial.set(key, row);
  }
  const trialBalance = [...trial.values()].sort(
    (a, b) =>
      currencyOrder(a.currency) - currencyOrder(b.currency) ||
      LEDGER_ACCOUNT_CLASSES.indexOf(a.accountClass) -
        LEDGER_ACCOUNT_CLASSES.indexOf(b.accountClass) ||
      (accountOrder.get(a.account) ?? 0) - (accountOrder.get(b.account) ?? 0) ||
      a.account.localeCompare(b.account),
  );

  const monthly = [...months.values()].sort(
    (a, b) =>
      a.month.localeCompare(b.month) || currencyOrder(a.currency) - currencyOrder(b.currency),
  );

  const budgetMonthValue = yearMonthOf(input.exportedOn);
  const budgets: LedgerBudgetRow[] = (input.budgets ?? [])
    .flatMap((budget) => {
      const category = budget.categoryId ? categoryById.get(budget.categoryId) : null;
      if (category === undefined || category?.archivedAt) return [];
      const spentMinor = monthSpend.get(`${budget.categoryId ?? ''}|${budget.currency}`) ?? 0;
      const progress = budgetProgress(
        budget.amountMinor,
        spentMinor,
        budgetMonthValue,
        input.exportedOn,
      );
      return [
        {
          scope: category ? category.name : 'All expenses',
          currency: budget.currency,
          budgetMinor: budget.amountMinor,
          spentMinor,
          remainingMinor: progress.remainingMinor,
          status: BUDGET_STATUS_TEXT[progress.status],
        },
      ];
    })
    .sort(
      (a, b) =>
        currencyOrder(a.currency) - currencyOrder(b.currency) ||
        Number(a.scope !== 'All expenses') - Number(b.scope !== 'All expenses') ||
        a.scope.localeCompare(b.scope),
    );

  const preparedBy = input.preparedBy?.trim();
  return {
    appName: input.appName,
    exportedOn: input.exportedOn,
    preparedLabel: `Prepared ${formatShortDate(input.exportedOn)}${preparedBy ? ` by ${preparedBy}` : ''}`,
    currencies,
    firstDate: transactions[0]?.postedDate ?? null,
    lastDate: transactions[transactions.length - 1]?.postedDate ?? null,
    entries,
    journal,
    trialBalance,
    accounts,
    parties,
    categories,
    monthly,
    budgetMonth: `${budgetMonth}-01`,
    budgets,
    totals,
    fileBaseName: `${input.appName.trim().replace(/\s+/g, '-') || 'Ledger'}-export-${input.exportedOn}`,
  };
}
