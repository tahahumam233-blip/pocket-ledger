import { escapeCsvCell } from './csv';
import { type CurrencyCode, getCurrency } from './currency';
import { formatDateLabel, type IsoDate, parseIsoDate } from './dates';
import type { DebtAction, TransactionKind } from './ledger';
import { formatMoney, minorToDecimalString, type MinorUnits } from './money';

/**
 * Debts are tracked on party (person) accounts from your books' point of view:
 * a positive (debit) balance is a receivable, a negative (credit) balance is a
 * payable. Debits raise the balance, credits lower it.
 */
export type DebtStanding = 'owes_you' | 'you_owe' | 'settled';

export function debtStanding(balanceMinor: MinorUnits): DebtStanding {
  if (balanceMinor > 0) return 'owes_you';
  if (balanceMinor < 0) return 'you_owe';
  return 'settled';
}

export type DebtActionInfo = {
  label: string;
  title: string;
  helper: string;
  icon: string;
  /** Whether the money moves from you to the person ("gave") or back ("got"). */
  direction: 'gave' | 'got';
};

export const DEBT_ACTION_INFO: Record<DebtAction, DebtActionInfo> = {
  lend: {
    label: 'Loan given',
    title: 'Loan given',
    helper: 'Cash out. Debits the party and increases the receivable.',
    icon: 'arrow-up-circle',
    direction: 'gave',
  },
  borrow: {
    label: 'Loan received',
    title: 'Loan received',
    helper: 'Cash in. Credits the party and increases the payable.',
    icon: 'arrow-down-circle',
    direction: 'got',
  },
  collect: {
    label: 'Repayment received',
    title: 'Repayment received',
    helper: 'Cash in. Credits the party and reduces the receivable.',
    icon: 'checkmark-circle',
    direction: 'got',
  },
  repay: {
    label: 'Repayment made',
    title: 'Repayment made',
    helper: 'Cash out. Debits the party and reduces the payable.',
    icon: 'return-up-forward',
    direction: 'gave',
  },
};

/**
 * Picks the natural action for a payment out ("gave") or in ("got") given the
 * current balance: paying a party you owe is a repayment, otherwise a loan.
 */
export function suggestDebtAction(direction: 'gave' | 'got', balanceMinor: MinorUnits): DebtAction {
  if (direction === 'gave') return balanceMinor < 0 ? 'repay' : 'lend';
  return balanceMinor > 0 ? 'collect' : 'borrow';
}

export type DebtTotals = {
  /** Receivables: debit balances on party accounts. */
  owedToYou: Partial<Record<CurrencyCode, MinorUnits>>;
  /** Payables: credit balances on party accounts, as positive amounts. */
  youOwe: Partial<Record<CurrencyCode, MinorUnits>>;
};

/** Sums debit balances (receivables) and credit balances (payables), per currency. */
export function summarizeDebts(
  people: readonly { balances: Partial<Record<CurrencyCode, MinorUnits>> }[],
): DebtTotals {
  const totals: DebtTotals = { owedToYou: {}, youOwe: {} };
  for (const person of people) {
    for (const [currency, amount] of Object.entries(person.balances)) {
      if (!amount) continue;
      if (amount > 0) totals.owedToYou[currency] = (totals.owedToYou[currency] ?? 0) + amount;
      else totals.youOwe[currency] = (totals.youOwe[currency] ?? 0) - amount;
    }
  }
  return totals;
}

/** One active ledger line on a person account, with what is needed to describe it. */
export type StatementSourceLine = {
  transactionId: string;
  postedDate: IsoDate;
  createdAt: string;
  kind: TransactionKind;
  debtAction: DebtAction | null;
  amountMinor: MinorUnits;
  note: string;
  categoryName: string | null;
  /** The other account in a debt movement, such as Pocket or Bank. */
  counterAccountName: string | null;
};

export type StatementEntry = StatementSourceLine & {
  description: string;
  /** Debit to the party (raises the balance), always zero or positive. */
  gaveMinor: MinorUnits;
  /** Credit to the party (lowers the balance), always zero or positive. */
  gotMinor: MinorUnits;
  balanceMinor: MinorUnits;
};

export type Statement = {
  currency: CurrencyCode;
  from: IsoDate | null;
  to: IsoDate | null;
  openingMinor: MinorUnits;
  entries: StatementEntry[];
  totalGaveMinor: MinorUnits;
  totalGotMinor: MinorUnits;
  closingMinor: MinorUnits;
};

export function describeStatementLine(line: StatementSourceLine): string {
  const via = line.counterAccountName;
  switch (line.debtAction) {
    case 'lend':
      return via ? `Loan given from ${via}` : 'Loan given';
    case 'borrow':
      return via ? `Loan received into ${via}` : 'Loan received';
    case 'collect':
      return via ? `Repayment received into ${via}` : 'Repayment received';
    case 'repay':
      return via ? `Repayment made from ${via}` : 'Repayment made';
    default:
      break;
  }
  switch (line.kind) {
    case 'expense':
      return line.categoryName
        ? `Expense paid on your behalf: ${line.categoryName}`
        : 'Expense paid on your behalf';
    case 'income':
      return line.categoryName ? `Income receivable: ${line.categoryName}` : 'Income receivable';
    case 'opening':
      return 'Opening balance';
    case 'adjustment':
      return 'Reconciliation adjustment';
    default:
      return 'Transfer';
  }
}

function compareLines(a: StatementSourceLine, b: StatementSourceLine): number {
  if (a.postedDate !== b.postedDate) return a.postedDate < b.postedDate ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : 0;
}

/**
 * Builds a statement of account for one person and currency. Lines before
 * `from` form the opening balance; lines after `to` are left out.
 */
export function buildStatement(
  lines: readonly StatementSourceLine[],
  currency: CurrencyCode,
  range: { from?: IsoDate | null; to?: IsoDate | null } = {},
): Statement {
  const from = range.from ?? null;
  const to = range.to ?? null;
  const sorted = [...lines].sort(compareLines);
  let opening = 0;
  let balance = 0;
  let totalGave = 0;
  let totalGot = 0;
  const entries: StatementEntry[] = [];
  for (const line of sorted) {
    if (from && line.postedDate < from) {
      opening += line.amountMinor;
      balance = opening;
      continue;
    }
    if (to && line.postedDate > to) continue;
    balance += line.amountMinor;
    const gave = line.amountMinor > 0 ? line.amountMinor : 0;
    const got = line.amountMinor < 0 ? -line.amountMinor : 0;
    totalGave += gave;
    totalGot += got;
    entries.push({
      ...line,
      description: describeStatementLine(line),
      gaveMinor: gave,
      gotMinor: got,
      balanceMinor: balance,
    });
  }
  return {
    currency,
    from,
    to,
    openingMinor: opening,
    entries,
    totalGaveMinor: totalGave,
    totalGotMinor: totalGot,
    closingMinor: opening + totalGave - totalGot,
  };
}

/** "$60.00 Dr", "$20.00 Cr" or "$0.00": a party balance in debit/credit form. */
export function formatDrCr(balanceMinor: MinorUnits, currency: CurrencyCode): string {
  const amount = formatMoney(Math.abs(balanceMinor), currency);
  if (balanceMinor > 0) return `${amount} Dr`;
  if (balanceMinor < 0) return `${amount} Cr`;
  return amount;
}

/** "Receivable from Ali: $60.00", "Payable to Ali: $20.00" or "Nil balance with Ali". */
export function describeBalance(
  name: string,
  balanceMinor: MinorUnits,
  currency: CurrencyCode,
): string {
  const amount = formatMoney(Math.abs(balanceMinor), currency);
  switch (debtStanding(balanceMinor)) {
    case 'owes_you':
      return `Receivable from ${name}: ${amount}`;
    case 'you_owe':
      return `Payable to ${name}: ${amount}`;
    default:
      return `Nil balance with ${name}`;
  }
}

function periodLabel(statement: Statement, today?: IsoDate): string {
  if (!statement.from && !statement.to) return 'All time';
  const from = statement.from ? formatDateLabel(statement.from, today) : 'the start';
  const to = statement.to ? formatDateLabel(statement.to, today) : 'today';
  return `${from} to ${to}`;
}

/** A plain-text statement suitable for sending in a message. */
export function statementToText(
  statement: Statement,
  personName: string,
  options: { appName?: string; today?: IsoDate } = {},
): string {
  const money = (minor: MinorUnits) => formatMoney(minor, statement.currency);
  const drcr = (minor: MinorUnits) => formatDrCr(minor, statement.currency);
  const lines = [
    `Statement of account: ${personName} (${statement.currency})`,
    `Period: ${periodLabel(statement, options.today)}`,
    '',
    `Opening balance b/f: ${drcr(statement.openingMinor)}`,
  ];
  for (const entry of statement.entries) {
    const movement = entry.gaveMinor
      ? `Debit ${money(entry.gaveMinor)}`
      : `Credit ${money(entry.gotMinor)}`;
    const note = entry.note ? ` (${entry.note})` : '';
    lines.push(
      `${formatDateLabel(entry.postedDate, options.today)}: ${entry.description}${note}. ${movement}. Balance ${drcr(entry.balanceMinor)}`,
    );
  }
  lines.push(
    '',
    `Total debits: ${money(statement.totalGaveMinor)}`,
    `Total credits: ${money(statement.totalGotMinor)}`,
    `Closing balance c/f: ${drcr(statement.closingMinor)}`,
    describeBalance(personName, statement.closingMinor, statement.currency),
  );
  if (options.appName) lines.push('', `Sent from ${options.appName}`);
  return lines.join('\n');
}

/** Dr for debit balances, Cr for credit balances, blank for nil. */
function drCrMark(minor: MinorUnits): string {
  if (minor > 0) return 'Dr';
  if (minor < 0) return 'Cr';
  return '';
}

/** A spreadsheet-friendly statement: debit, credit and a running Dr/Cr balance. */
export function statementToCsv(statement: Statement): string {
  const digits = getCurrency(statement.currency).fractionDigits;
  const amount = (minor: MinorUnits) => (minor ? minorToDecimalString(minor, digits) : '');
  const balance = (minor: MinorUnits) => minorToDecimalString(Math.abs(minor), digits);
  const rows = [
    [
      'Date',
      'Description',
      'Note',
      `Debit (${statement.currency})`,
      `Credit (${statement.currency})`,
      `Balance (${statement.currency})`,
      'Dr/Cr',
    ],
    [
      '',
      'Opening balance b/f',
      '',
      '',
      '',
      balance(statement.openingMinor),
      drCrMark(statement.openingMinor),
    ],
    ...statement.entries.map((entry) => [
      entry.postedDate,
      entry.description,
      entry.note,
      amount(entry.gaveMinor),
      amount(entry.gotMinor),
      balance(entry.balanceMinor),
      drCrMark(entry.balanceMinor),
    ]),
    [
      '',
      'Closing balance c/f',
      '',
      minorToDecimalString(statement.totalGaveMinor, digits),
      minorToDecimalString(statement.totalGotMinor, digits),
      balance(statement.closingMinor),
      drCrMark(statement.closingMinor),
    ],
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
}

export type DueStatus = { label: string; overdue: boolean };

/** "Due today", "Due in 5 days", "3 days overdue"; null when there is nothing to settle. */
export function describeDue(
  dueDate: IsoDate | null,
  today: IsoDate,
  hasBalance: boolean,
): DueStatus | null {
  if (!dueDate || !hasBalance) return null;
  const days = Math.round(
    (parseIsoDate(dueDate).getTime() - parseIsoDate(today).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return { label: 'Due today', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', overdue: false };
  if (days > 1 && days <= 30) return { label: `Due in ${days} days`, overdue: false };
  if (days > 30) return { label: `Due ${formatDateLabel(dueDate, today)}`, overdue: false };
  return { label: days === -1 ? 'Overdue by 1 day' : `Overdue by ${-days} days`, overdue: true };
}
