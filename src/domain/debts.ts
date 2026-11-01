import { escapeCsvCell } from './csv';
import { type CurrencyCode, getCurrency } from './currency';
import { formatDateLabel, type IsoDate, parseIsoDate } from './dates';
import type { DebtAction, TransactionKind } from './ledger';
import { formatMoney, minorToDecimalString, type MinorUnits } from './money';

/**
 * Debts are tracked on person accounts with one sign convention:
 * a positive balance means the person owes you, a negative balance means
 * you owe them. "You gave" raises the balance, "You got" lowers it.
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
    label: 'Lend',
    title: 'I lent money',
    helper: 'You gave money. They will owe you.',
    icon: 'arrow-up-circle',
    direction: 'gave',
  },
  borrow: {
    label: 'Borrow',
    title: 'I borrowed money',
    helper: 'You got money. You will owe them.',
    icon: 'arrow-down-circle',
    direction: 'got',
  },
  collect: {
    label: 'Got paid back',
    title: 'They paid me back',
    helper: 'They returned money they owed you.',
    icon: 'checkmark-circle',
    direction: 'got',
  },
  repay: {
    label: 'Paid back',
    title: 'I paid them back',
    helper: 'You returned money you owed them.',
    icon: 'return-up-forward',
    direction: 'gave',
  },
};

/**
 * Picks the natural action for "I gave" or "I got" given the current balance:
 * giving to someone you owe is a repayment, otherwise it is a loan.
 */
export function suggestDebtAction(direction: 'gave' | 'got', balanceMinor: MinorUnits): DebtAction {
  if (direction === 'gave') return balanceMinor < 0 ? 'repay' : 'lend';
  return balanceMinor > 0 ? 'collect' : 'borrow';
}

export type DebtTotals = {
  owedToYou: Partial<Record<CurrencyCode, MinorUnits>>;
  youOwe: Partial<Record<CurrencyCode, MinorUnits>>;
};

/** Sums positive balances (owed to you) and negative ones (you owe), per currency. */
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
  /** Amount that raised the balance (you gave), always zero or positive. */
  gaveMinor: MinorUnits;
  /** Amount that lowered the balance (you got), always zero or positive. */
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
      return via ? `Lent from ${via}` : 'Lent';
    case 'borrow':
      return via ? `Borrowed into ${via}` : 'Borrowed';
    case 'collect':
      return via ? `Paid you back into ${via}` : 'Paid you back';
    case 'repay':
      return via ? `You paid back from ${via}` : 'You paid back';
    default:
      break;
  }
  switch (line.kind) {
    case 'expense':
      return line.categoryName ? `Paid for you: ${line.categoryName}` : 'Paid for you';
    case 'income':
      return line.categoryName ? `Owed to you: ${line.categoryName}` : 'Owed to you';
    case 'opening':
      return 'Starting balance';
    case 'adjustment':
      return 'Balance correction';
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

/** "Ali owes you $60.00", "You owe Ali $20.00" or "All settled with Ali". */
export function describeBalance(
  name: string,
  balanceMinor: MinorUnits,
  currency: CurrencyCode,
): string {
  const amount = formatMoney(Math.abs(balanceMinor), currency);
  switch (debtStanding(balanceMinor)) {
    case 'owes_you':
      return `${name} owes you ${amount}`;
    case 'you_owe':
      return `You owe ${name} ${amount}`;
    default:
      return `All settled with ${name}`;
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
  const lines = [
    `Statement of account: ${personName} (${statement.currency})`,
    `Period: ${periodLabel(statement, options.today)}`,
    '',
    `Opening balance: ${describeBalance(personName, statement.openingMinor, statement.currency)}`,
  ];
  for (const entry of statement.entries) {
    const movement = entry.gaveMinor
      ? `You gave ${money(entry.gaveMinor)}`
      : `You got ${money(entry.gotMinor)}`;
    const note = entry.note ? ` (${entry.note})` : '';
    lines.push(
      `${formatDateLabel(entry.postedDate, options.today)}: ${entry.description}${note}. ${movement}. Balance ${money(entry.balanceMinor)}`,
    );
  }
  lines.push(
    '',
    `Total you gave: ${money(statement.totalGaveMinor)}`,
    `Total you got: ${money(statement.totalGotMinor)}`,
    `Closing balance: ${describeBalance(personName, statement.closingMinor, statement.currency)}`,
  );
  if (options.appName) lines.push('', `Sent from ${options.appName}`);
  return lines.join('\n');
}

/** A spreadsheet-friendly statement with a running balance. */
export function statementToCsv(statement: Statement): string {
  const digits = getCurrency(statement.currency).fractionDigits;
  const amount = (minor: MinorUnits) => (minor ? minorToDecimalString(minor, digits) : '');
  const rows = [
    [
      'Date',
      'Description',
      'Note',
      `You gave (${statement.currency})`,
      `You got (${statement.currency})`,
      'Balance',
    ],
    ['', 'Opening balance', '', '', '', minorToDecimalString(statement.openingMinor, digits)],
    ...statement.entries.map((entry) => [
      entry.postedDate,
      entry.description,
      entry.note,
      amount(entry.gaveMinor),
      amount(entry.gotMinor),
      minorToDecimalString(entry.balanceMinor, digits),
    ]),
    [
      '',
      'Closing balance',
      '',
      minorToDecimalString(statement.totalGaveMinor, digits),
      minorToDecimalString(statement.totalGotMinor, digits),
      minorToDecimalString(statement.closingMinor, digits),
    ],
  ];
  return `﻿${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
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
  return { label: days === -1 ? '1 day overdue' : `${-days} days overdue`, overdue: true };
}
