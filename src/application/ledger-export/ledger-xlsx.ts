import {
  type CurrencyCode,
  formatShortDate,
  getCurrency,
  type MinorUnits,
  minorToDecimalString,
} from '@/domain';

import type { DocumentTheme } from '../file-formats/theme';
import {
  buildXlsx,
  type XlsxCell,
  type XlsxRow,
  type XlsxSheet,
  type XlsxStyle,
} from '../file-formats/xlsx';

import type { LedgerExportDocument } from './document';

const DATE_FORMAT = 'd mmm yyyy';
const MONTH_FORMAT = 'mmm yyyy';

/** What each sheet holds and how to read the figures, for a person or an assistant. */
export const LEDGER_EXPORT_NOTES = [
  'Entries: one row per entry, oldest first. "Counts as income" and "Counts as expense" are the amounts used in reports. Transfers, exchanges, loans, repayments, opening balances and reconciliation adjustments are neither income nor expenses.',
  'Entries: "Cash & bank change" is the net effect on your own accounts and "Receivable/payable change" the net effect on party balances, both in the entry\'s currency.',
  'Journal: every entry as debit and credit lines that balance. Cash & bank and Party lines are real accounts; Expense, Income, Opening balances, Reconciliation and Currency exchange lines are the other side of the entry.',
  'Trial balance: total debits and credits per account. Debits equal credits in each currency.',
  'Accounts, Parties, Categories: balances and totals per currency. A party balance is a receivable when they owe you and a payable when you owe them.',
  'Monthly: income, expenses and net income for each month and currency.',
  'Amounts in different currencies are never added together. An exchange shows what was given and what was received; its rate is the ratio of the two.',
  "A split expense counts only your own share as an expense; each party's share is a receivable from them.",
  'Deleted entries and receipt photos are not part of this file.',
] as const;

const NOTE_LINE_LENGTH = 92;

/** Breaks text into lines of at most the given length, at spaces. */
function wrapWords(textToWrap: string, maxLength: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of textToWrap.split(' ')) {
    if (current && current.length + 1 + word.length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function moneyFormat(currency: CurrencyCode): string {
  const digits = getCurrency(currency).fractionDigits;
  return digits > 0 ? `#,##0.${'0'.repeat(digits)}` : '#,##0';
}

/**
 * The whole ledger as an Excel workbook with one sheet per view. Every figure is
 * a real number in its own currency's precision and every date a real date, so
 * the file can be filtered, pivoted and totalled, by a person or by a program.
 */
export function buildLedgerXlsx(document: LedgerExportDocument, theme: DocumentTheme): Uint8Array {
  const head: XlsxStyle = { bold: true, color: '#FFFFFF', fill: theme.primary, wrap: true };
  const headRight: XlsxStyle = { ...head, align: 'right' };
  const body: XlsxStyle = { color: theme.text, borderBottom: theme.border };
  const muted: XlsxStyle = { ...body, color: theme.textMuted };
  const wrap: XlsxStyle = { ...body, wrap: true };
  const strong: XlsxStyle = { bold: true, color: theme.text, fill: theme.surfaceMuted };
  const label: XlsxStyle = { color: theme.textMuted };

  const text = (value: string, style: XlsxStyle = body): XlsxCell =>
    value ? { type: 'text', value, style } : { type: 'blank', style };
  const count = (value: number, style: XlsxStyle = body): XlsxCell => ({
    type: 'number',
    value: String(value),
    style: { ...style, align: 'right' },
  });
  /** An entry number: an identifier, so it sits on the left like text. */
  const entryNumber = (value: number): XlsxCell => ({
    type: 'number',
    value: String(value),
    style: { ...muted, align: 'left' },
  });
  /** Text that follows a column of figures, set in a little so the two do not touch. */
  const afterFigures = (value: string, style: XlsxStyle = body): XlsxCell =>
    text(value, { ...style, align: 'left', indent: 1 });
  const date = (value: string, format = DATE_FORMAT): XlsxCell => ({
    type: 'date',
    value,
    style: { ...body, format, align: 'left' },
  });
  /** A figure in its currency's precision; zero is left empty unless asked for. */
  const money = (
    minor: MinorUnits,
    currency: CurrencyCode,
    options: { showZero?: boolean; style?: XlsxStyle } = {},
  ): XlsxCell => {
    const style: XlsxStyle = {
      ...(options.style ?? body),
      format: moneyFormat(currency),
      align: 'right',
    };
    if (minor === 0 && !options.showZero) return { type: 'blank', style };
    return {
      type: 'number',
      value: minorToDecimalString(minor, getCurrency(currency).fractionDigits),
      style,
    };
  };
  const header = (labels: string[], rightFrom: (label: string) => boolean): XlsxRow => ({
    // Room for a heading of two lines.
    height: 32,
    cells: labels.map((item) => text(item, rightFrom(item) ? headRight : head)),
  });
  const numeric = (labels: string[]) => (item: string) =>
    labels.some((key) => item.startsWith(key));

  const { currencies } = document;

  // Summary
  const period =
    document.firstDate && document.lastDate
      ? `${formatShortDate(document.firstDate)} to ${formatShortDate(document.lastDate)}`
      : 'No entries yet';
  const summaryRows: XlsxRow[] = [
    {
      height: 26,
      cells: [text(`${document.appName} export`, { bold: true, size: 16, color: theme.primary })],
    },
    { cells: [text(document.preparedLabel, label)] },
    { cells: [] },
    { cells: [text('Period covered', label), text(period, { color: theme.text })] },
    {
      cells: [
        text('Currencies', label),
        text(`${currencies.join(', ')} (never added together)`, { color: theme.text }),
      ],
    },
    { cells: [text('Entries', label), count(document.entries.length, { color: theme.text })] },
    { cells: [] },
    {
      height: 22,
      cells: [text('Balances', head), ...currencies.map((code) => text(code, headRight))],
    },
    ...document.accounts.map((account) => ({
      cells: [
        text(account.archived ? `${account.name} (archived)` : account.name),
        ...currencies.map((code) => money(account.balances[code] ?? 0, code, { showZero: true })),
      ],
    })),
    {
      cells: [
        text('Total cash & bank', strong),
        ...currencies.map((code) =>
          money(document.totals.cash[code] ?? 0, code, { showZero: true, style: strong }),
        ),
      ],
    },
    {
      cells: [
        text('Receivables from parties'),
        ...currencies.map((code) =>
          money(document.totals.receivables[code] ?? 0, code, {
            showZero: true,
            style: { ...body, color: theme.income },
          }),
        ),
      ],
    },
    {
      cells: [
        text('Payables to parties'),
        ...currencies.map((code) =>
          money(document.totals.payables[code] ?? 0, code, {
            showZero: true,
            style: { ...body, color: theme.expense },
          }),
        ),
      ],
    },
    { cells: [] },
    { cells: [text('How to read this file', { bold: true, color: theme.text })] },
    ...LEDGER_EXPORT_NOTES.flatMap((note) =>
      wrapWords(note, NOTE_LINE_LENGTH).map((line, index) => ({
        cells: [text(index === 0 ? `\u2022 ${line}` : `   ${line}`, label)],
      })),
    ),
  ];

  // Entries
  const entryLabels = [
    'No.',
    'Date',
    'Type',
    'Description',
    'Category',
    'Account',
    'To account',
    'Party',
    'Currency',
    'Amount',
    'Cash & bank change',
    'Receivable/payable change',
    'Counts as income',
    'Counts as expense',
    'Received currency',
    'Received amount',
    'Rate',
    'Note',
    'Receipts',
    'Recorded at (UTC)',
    'Entry ID',
  ];
  const entryRows: XlsxRow[] = [
    header(
      entryLabels,
      numeric(['Amount', 'Cash', 'Receivable', 'Counts', 'Received amount', 'Receipts']),
    ),
    ...document.entries.map((entry) => ({
      cells: [
        entryNumber(entry.number),
        date(entry.date),
        text(entry.type),
        text(entry.description, wrap),
        text(entry.category),
        text(entry.account),
        text(entry.toAccount),
        text(entry.party),
        text(entry.currency, muted),
        money(entry.amountMinor, entry.currency, { showZero: true }),
        money(entry.cashChangeMinor, entry.currency),
        money(entry.partyChangeMinor, entry.currency),
        money(entry.incomeMinor, entry.currency, { style: { ...body, color: theme.income } }),
        money(entry.expenseMinor, entry.currency, { style: { ...body, color: theme.expense } }),
        text(entry.receivedCurrency, muted),
        entry.receivedCurrency
          ? money(entry.receivedMinor, entry.receivedCurrency)
          : { type: 'blank' as const, style: body },
        afterFigures(entry.rate),
        text(entry.note, { ...muted, wrap: true }),
        entry.receipts ? count(entry.receipts) : { type: 'blank' as const, style: body },
        afterFigures(entry.recordedAt, muted),
        text(entry.id, muted),
      ],
    })),
  ];

  // Journal
  const journalRows: XlsxRow[] = [
    header(
      [
        'Entry no.',
        'Date',
        'Type',
        'Account',
        'Account class',
        'Currency',
        'Debit',
        'Credit',
        'Description',
        'Note',
        'Entry ID',
      ],
      numeric(['Debit', 'Credit']),
    ),
    ...document.journal.map((line) => ({
      cells: [
        entryNumber(line.entryNumber),
        date(line.date),
        text(line.type),
        text(line.account),
        text(line.accountClass, muted),
        text(line.currency, muted),
        money(line.debitMinor, line.currency),
        money(line.creditMinor, line.currency),
        afterFigures(line.description, wrap),
        text(line.note, { ...muted, wrap: true }),
        text(line.entryId, muted),
      ],
    })),
  ];

  // Trial balance, one block per currency with its totals.
  const trialRows: XlsxRow[] = [
    header(
      ['Currency', 'Account', 'Account class', 'Debit', 'Credit', 'Balance', 'Dr/Cr'],
      numeric(['Debit', 'Credit', 'Balance']),
    ),
  ];
  for (const code of currencies) {
    const rows = document.trialBalance.filter((row) => row.currency === code);
    if (rows.length === 0) continue;
    for (const row of rows) {
      const balance = row.debitMinor - row.creditMinor;
      trialRows.push({
        cells: [
          text(code, muted),
          text(row.account),
          text(row.accountClass, muted),
          money(row.debitMinor, code),
          money(row.creditMinor, code),
          money(Math.abs(balance), code, { showZero: true }),
          text(balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : '', muted),
        ],
      });
    }
    const sum = (pick: (row: (typeof rows)[number]) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    trialRows.push({
      cells: [
        text(code, strong),
        text(`Total ${code}`, strong),
        { type: 'blank', style: strong },
        money(
          sum((row) => row.debitMinor),
          code,
          { showZero: true, style: strong },
        ),
        money(
          sum((row) => row.creditMinor),
          code,
          { showZero: true, style: strong },
        ),
        { type: 'blank', style: strong },
        { type: 'blank', style: strong },
      ],
    });
  }

  // Accounts
  const accountRows: XlsxRow[] = [
    header(
      ['Account', 'Type', 'Status', ...currencies.map((code) => `Balance ${code}`)],
      numeric(['Balance']),
    ),
    ...document.accounts.map((account) => ({
      cells: [
        text(account.name),
        text(account.kind, muted),
        text(account.archived ? 'Archived' : 'Active', muted),
        ...currencies.map((code) => money(account.balances[code] ?? 0, code, { showZero: true })),
      ],
    })),
  ];

  // Parties
  const partyRows: XlsxRow[] = [
    header(
      [
        'Party',
        'Note',
        'Due date',
        'Status',
        ...currencies.flatMap((code) => [`Receivable ${code}`, `Payable ${code}`]),
      ],
      numeric(['Receivable', 'Payable']),
    ),
    ...document.parties.map((party) => ({
      cells: [
        text(party.name),
        text(party.note, { ...muted, wrap: true }),
        party.dueDate ? date(party.dueDate) : { type: 'blank' as const, style: body },
        text(party.archived ? 'Archived' : 'Active', muted),
        ...currencies.flatMap((code) => {
          const balance = party.balances[code] ?? 0;
          return [
            money(Math.max(balance, 0), code, { style: { ...body, color: theme.income } }),
            money(Math.max(-balance, 0), code, { style: { ...body, color: theme.expense } }),
          ];
        }),
      ],
    })),
  ];

  // Categories
  const categoryRows: XlsxRow[] = [
    header(
      ['Category', 'Kind', 'Status', 'Entries', ...currencies.map((code) => `Total ${code}`)],
      numeric(['Entries', 'Total']),
    ),
    ...document.categories.map((category) => ({
      cells: [
        text(category.name),
        text(category.kind, muted),
        text(category.archived ? 'Archived' : 'Active', muted),
        count(category.entries),
        ...currencies.map((code) => money(category.totals[code] ?? 0, code)),
      ],
    })),
  ];

  // Monthly
  const monthlyRows: XlsxRow[] = [
    header(
      ['Month', 'Currency', 'Income', 'Expenses', 'Net income'],
      numeric(['Income', 'Expenses', 'Net']),
    ),
    ...document.monthly.map((row) => ({
      cells: [
        date(row.month, MONTH_FORMAT),
        text(row.currency, muted),
        money(row.incomeMinor, row.currency, { showZero: true }),
        money(row.expenseMinor, row.currency, { showZero: true }),
        money(row.incomeMinor - row.expenseMinor, row.currency, { showZero: true }),
      ],
    })),
  ];

  const table = (
    name: string,
    columnWidths: number[],
    rows: XlsxRow[],
    landscape = false,
  ): XlsxSheet => ({
    name,
    columnWidths,
    rows,
    freezeRows: 1,
    printTitleRow: 1,
    filterRow: 1,
    landscape,
  });

  return buildXlsx(
    [
      { name: 'Summary', columnWidths: [30, ...currencies.map(() => 18), 18], rows: summaryRows },
      table(
        'Entries',
        [6, 12, 22, 38, 20, 14, 14, 18, 9, 14, 16, 18, 15, 15, 10, 15, 24, 30, 9, 25, 34],
        entryRows,
        true,
      ),
      table('Journal', [9, 12, 22, 32, 18, 9, 14, 14, 38, 30, 34], journalRows, true),
      table('Trial balance', [9, 34, 18, 16, 16, 16, 7], trialRows),
      table('Accounts', [22, 12, 11, ...currencies.map(() => 16)], accountRows),
      table('Parties', [24, 30, 13, 11, ...currencies.flatMap(() => [16, 16])], partyRows, true),
      table('Categories', [24, 10, 11, 9, ...currencies.map(() => 16)], categoryRows),
      table('Monthly', [12, 9, 16, 16, 16], monthlyRows),
    ],
    { created: new Date(`${document.exportedOn}T00:00:00Z`) },
  );
}
