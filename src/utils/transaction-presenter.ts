import type { ThemeColors } from '@/design';
import type { Account, Category, LedgerLine, TransactionWithLines } from '@/domain';

export type TransactionPresentation = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  /** The amounts to show on the right; exchanges carry two. */
  amounts: { amountMinor: number; currency: string }[];
  kindLabel: string;
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
  opening: 'Opening balance',
  adjustment: 'Balance adjustment',
} as const;

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
    };
  }

  const line = lines[0];
  const account = line ? lookup.accounts.get(line.accountId) : undefined;
  const amounts = line ? [{ amountMinor: line.amountMinor, currency: line.currency }] : [];

  if (kind === 'opening' || kind === 'adjustment') {
    return {
      title: kindLabel,
      subtitle: [account?.name, note && note !== kindLabel ? note : null]
        .filter(Boolean)
        .join(' · '),
      icon: kind === 'opening' ? 'flag' : 'options',
      color: colors.textMuted,
      amounts,
      kindLabel,
    };
  }

  const category = transaction.categoryId
    ? lookup.categories.get(transaction.categoryId)
    : undefined;
  return {
    title: category?.name ?? (kind === 'income' ? 'Income' : 'Expense'),
    subtitle: [account?.name, note].filter(Boolean).join(' · '),
    icon: category?.icon ?? (kind === 'income' ? 'cash' : 'cart'),
    color: category?.color ?? (kind === 'income' ? colors.income : colors.expense),
    amounts,
    kindLabel,
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
