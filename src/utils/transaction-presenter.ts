import type { ThemeColors } from '@/design';
import {
  type Account,
  type Category,
  DEBT_ACTION_INFO,
  debtGoesToPerson,
  type LedgerLine,
  type TransactionWithLines,
} from '@/domain';

export type TransactionPresentation = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  /** The amounts to show on the right; exchanges carry two. */
  amounts: { amountMinor: number; currency: string }[];
  kindLabel: string;
  /** Loans show the signed movement of your own money, in neutral colours. */
  neutral: boolean;
  /** The party involved, for loans and for entries posted on account. */
  person: Account | null;
};

export type Lookup = {
  accounts: ReadonlyMap<string, Account>;
  categories: ReadonlyMap<string, Category>;
};

export function buildLookup(accounts: readonly Account[], categories: readonly Category[]): Lookup {
  return {
    accounts: new Map(accounts.map((account) => [account.id, account])),
    categories: new Map(categories.map((category) => [category.id, category])),
  };
}

export const KIND_LABELS = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  debt: 'Loan',
  opening: 'Opening balance',
  adjustment: 'Reconciliation adjustment',
} as const;

const DEBT_TITLES = {
  lend: (name: string) => `Loan given to ${name}`,
  borrow: (name: string) => `Loan received from ${name}`,
  collect: (name: string) => `Repayment received from ${name}`,
  repay: (name: string) => `Repayment made to ${name}`,
} as const;

/** Default notes written on system entries, including the wording used before version 1.2. */
const SYSTEM_NOTES = new Set([
  'Opening balance',
  'Reconciliation adjustment',
  'Balance adjustment',
]);

function lineByRole(lines: LedgerLine[], role: LedgerLine['role']) {
  return lines.find((line) => line.role === role);
}

export function presentTransaction(
  transaction: TransactionWithLines,
  lookup: Lookup,
  colors: ThemeColors,
): TransactionPresentation {
  const { kind, lines, note } = transaction;
  const kindLabel = KIND_LABELS[kind];

  if (kind === 'transfer' && transaction.debtAction) {
    const action = transaction.debtAction;
    const toPerson = debtGoesToPerson(action);
    const personLine = lineByRole(lines, toPerson ? 'destination' : 'source');
    const moneyLine = lineByRole(lines, toPerson ? 'source' : 'destination');
    const person = personLine ? (lookup.accounts.get(personLine.accountId) ?? null) : null;
    const moneyAccount = moneyLine ? lookup.accounts.get(moneyLine.accountId) : undefined;
    return {
      title: DEBT_TITLES[action](person?.name ?? 'party'),
      subtitle: [moneyAccount?.name, note].filter(Boolean).join(' · '),
      icon: DEBT_ACTION_INFO[action].icon,
      color: person?.color ?? colors.transfer,
      amounts: moneyLine
        ? [{ amountMinor: moneyLine.amountMinor, currency: moneyLine.currency }]
        : [],
      kindLabel: DEBT_ACTION_INFO[action].label,
      neutral: true,
      person,
    };
  }

  if (kind === 'transfer') {
    const source = lineByRole(lines, 'source');
    const destination = lineByRole(lines, 'destination');
    const from = source ? (lookup.accounts.get(source.accountId)?.name ?? 'Account') : 'Account';
    const to = destination
      ? (lookup.accounts.get(destination.accountId)?.name ?? 'Account')
      : 'Account';
    const isExchange = Boolean(source && destination && source.currency !== destination.currency);
    const amounts = [source, destination]
      .filter((line): line is LedgerLine => Boolean(line))
      .map((line) => ({ amountMinor: line.amountMinor, currency: line.currency }));
    return {
      title: isExchange ? 'Exchange' : 'Transfer',
      subtitle: note ? `${from} → ${to} · ${note}` : `${from} → ${to}`,
      icon: isExchange ? 'swap-horizontal' : 'arrow-forward-circle',
      color: colors.transfer,
      amounts: isExchange ? amounts : amounts.slice(1),
      kindLabel: isExchange ? 'Exchange' : 'Transfer',
      neutral: true,
      person: null,
    };
  }

  const line = lines[0];
  const account = line ? lookup.accounts.get(line.accountId) : undefined;
  const person = account?.accountClass === 'person' ? account : null;
  const amounts = line ? [{ amountMinor: line.amountMinor, currency: line.currency }] : [];

  if (kind === 'opening' || kind === 'adjustment') {
    return {
      title: kindLabel,
      subtitle: [account?.name, note && !SYSTEM_NOTES.has(note) ? note : null]
        .filter(Boolean)
        .join(' · '),
      icon: kind === 'opening' ? 'flag' : 'options',
      color: colors.textMuted,
      amounts,
      kindLabel,
      neutral: Boolean(person),
      person,
    };
  }

  const category = transaction.categoryId
    ? lookup.categories.get(transaction.categoryId)
    : undefined;
  const via = person
    ? kind === 'income'
      ? `Receivable from ${person.name}`
      : `Paid by ${person.name} (payable)`
    : account?.name;
  return {
    title: category?.name ?? (kind === 'income' ? 'Income' : 'Expense'),
    subtitle: [via, note].filter(Boolean).join(' · '),
    icon: category?.icon ?? (kind === 'income' ? 'cash' : 'cart'),
    color: category?.color ?? (kind === 'income' ? colors.income : colors.expense),
    amounts,
    kindLabel,
    neutral: false,
    person,
  };
}

/** Groups a date-sorted list into day sections, preserving order. */
export function groupByDay<T extends { postedDate: string }>(
  items: readonly T[],
): { date: string; items: T[] }[] {
  const sections: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.date === item.postedDate) last.items.push(item);
    else sections.push({ date: item.postedDate, items: [item] });
  }
  return sections;
}
