import { describe, expect, it } from '@jest/globals';

import { lightColors } from '@/design/tokens';
import type { Account, Budget, Category, TransactionWithLines } from '@/domain';
import { readZip } from '@/test/read-zip';

import { buildLedgerExport, type LedgerExportInput } from './document';
import { buildLedgerCsv, LEDGER_CSV_HEADERS } from './ledger-csv';
import { buildLedgerXlsx, LEDGER_EXPORT_NOTES } from './ledger-xlsx';

const account = (
  id: string,
  name: string,
  accountClass: Account['accountClass'] = 'money',
  overrides: Partial<Account> = {},
): Account => ({
  id,
  name,
  kind: accountClass === 'person' ? 'other' : 'pocket',
  accountClass,
  icon: 'wallet',
  color: '#000000',
  sortOrder: 0,
  note: '',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  ...overrides,
});

const category = (id: string, name: string, kind: Category['kind']): Category => ({
  id,
  name,
  kind,
  icon: 'cart',
  color: '#000000',
  sortOrder: 0,
  isSystem: false,
  archivedAt: null,
});

let lineId = 0;
const entry = (
  id: string,
  kind: TransactionWithLines['kind'],
  postedDate: string,
  lines: [
    accountId: string,
    currency: string,
    amountMinor: number,
    role: 'main' | 'source' | 'destination',
  ][],
  overrides: Partial<TransactionWithLines> = {},
): TransactionWithLines => ({
  id,
  kind,
  debtAction: null,
  postedDate,
  categoryId: null,
  note: '',
  createdAt: `${postedDate}T09:00:00.000Z`,
  updatedAt: `${postedDate}T09:00:00.000Z`,
  deletedAt: null,
  lines: lines.map(([accountId, currency, amountMinor, role]) => ({
    id: `line-${(lineId += 1)}`,
    transactionId: id,
    accountId,
    currency,
    amountMinor,
    role,
  })),
  ...overrides,
});

const input = (): LedgerExportInput => ({
  appName: 'Pocket Ledger',
  exportedOn: '2026-11-16',
  preparedBy: 'Taha',
  currencies: ['USD', 'IQD'],
  accounts: [
    account('pocket', 'Pocket', 'money', { sortOrder: 1 }),
    account('bank', 'Bank', 'money', { sortOrder: 2, kind: 'bank' }),
    account('old', 'Old wallet', 'money', { sortOrder: 0, archivedAt: '2026-02-01T00:00:00.000Z' }),
    account('ali', 'Ali', 'person', { note: 'Colleague', dueDate: '2026-12-01' }),
  ],
  categories: [
    category('food', 'Food & Drink', 'expense'),
    category('rent', 'Rent', 'expense'),
    category('salary', 'Salary', 'income'),
  ],
  transactions: [
    // Given out of order on purpose; the export sorts by date.
    entry(
      't-lunch',
      'expense',
      '2026-10-12',
      [
        ['bank', 'USD', -3000, 'main'],
        ['ali', 'USD', 1800, 'destination'],
      ],
      { categoryId: 'food', note: 'Team lunch' },
    ),
    entry('t-open', 'opening', '2026-10-01', [['pocket', 'USD', 50000, 'main']]),
    entry('t-salary', 'income', '2026-10-05', [['bank', 'USD', 200000, 'main']], {
      categoryId: 'salary',
    }),
    entry('t-fx', 'transfer', '2026-10-08', [
      ['pocket', 'USD', -10000, 'source'],
      ['pocket', 'IQD', 131000, 'destination'],
    ]),
    entry('t-move', 'transfer', '2026-10-09', [
      ['bank', 'USD', -20000, 'source'],
      ['pocket', 'USD', 20000, 'destination'],
    ]),
    entry(
      't-lend',
      'transfer',
      '2026-10-10',
      [
        ['pocket', 'USD', -6000, 'source'],
        ['ali', 'USD', 6000, 'destination'],
      ],
      { debtAction: 'lend' },
    ),
    entry('t-adjust', 'adjustment', '2026-11-02', [['pocket', 'IQD', -1000, 'main']]),
    entry('t-gone', 'expense', '2026-10-20', [['pocket', 'USD', -999, 'main']], {
      categoryId: 'food',
      deletedAt: '2026-10-21T00:00:00.000Z',
    }),
  ],
  receiptCounts: new Map([['t-lunch', 2]]),
});

/** The fixture plus November spending and budgets, measured on 16 November. */
const withBudgets = (): LedgerExportInput => {
  const base = input();
  const budget = (categoryId: string | null, currency: string, amountMinor: number): Budget => ({
    id: `bud-${categoryId ?? 'all'}-${currency}`,
    categoryId,
    currency,
    amountMinor,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  });
  return {
    ...base,
    categories: [
      ...base.categories,
      { ...category('old', 'Old habit', 'expense'), archivedAt: '2026-03-01T00:00:00.000Z' },
    ],
    transactions: [
      ...base.transactions,
      // Ali owes 10.00 of this 25.00, so 15.00 is your own expense.
      entry(
        't-nov-food',
        'expense',
        '2026-11-03',
        [
          ['bank', 'USD', -2500, 'main'],
          ['ali', 'USD', 1000, 'destination'],
        ],
        { categoryId: 'food' },
      ),
      entry('t-nov-rent', 'expense', '2026-11-01', [['bank', 'USD', -40000, 'main']], {
        categoryId: 'rent',
      }),
      entry('t-nov-iqd', 'expense', '2026-11-04', [['pocket', 'IQD', -5000, 'main']], {
        categoryId: 'food',
      }),
      entry('t-nov-gone', 'expense', '2026-11-05', [['bank', 'USD', -7700, 'main']], {
        categoryId: 'food',
        deletedAt: '2026-11-05T10:00:00.000Z',
      }),
    ],
    budgets: [
      budget('rent', 'USD', 40000),
      budget('food', 'IQD', 20000),
      budget('food', 'USD', 1000),
      budget(null, 'USD', 100000),
      budget('old', 'USD', 500),
      budget('missing', 'USD', 500),
    ],
  };
};

describe('ledger export document', () => {
  const document = buildLedgerExport(input());

  it('measures each budget against the month of export', () => {
    const budgeted = buildLedgerExport(withBudgets());
    expect(budgeted.budgetMonth).toBe('2026-11-01');
    // 16 of 30 days gone: an even pace has used 16/30 of each budget.
    expect(
      budgeted.budgets.map((row) => [
        row.scope,
        row.currency,
        row.budgetMinor,
        row.spentMinor,
        row.remainingMinor,
        row.status,
      ]),
    ).toEqual([
      ['All expenses', 'USD', 100000, 41500, 58500, 'On track'],
      ['Food & Drink', 'USD', 1000, 1500, -500, 'Over budget'],
      ['Rent', 'USD', 40000, 40000, 0, 'Ahead of pace'],
      ['Food & Drink', 'IQD', 20000, 5000, 15000, 'On track'],
    ]);
    expect(document.budgets).toEqual([]);
  });

  it('numbers entries oldest first and leaves deleted ones out', () => {
    expect(document.entries.map((item) => [item.number, item.type, item.description])).toEqual([
      [1, 'Opening balance', 'Opening balance: Pocket'],
      [2, 'Income', 'Salary'],
      [3, 'Exchange', 'Exchange at 1 USD = 1,310 IQD'],
      [4, 'Transfer', 'Bank to Pocket'],
      [5, 'Loan given', 'Loan given to Ali'],
      [6, 'Expense', 'Food & Drink (split with Ali)'],
      [7, 'Reconciliation adjustment', 'Reconciliation adjustment: Pocket'],
    ]);
    expect([document.firstDate, document.lastDate]).toEqual(['2026-10-01', '2026-11-02']);
    expect(document.preparedLabel).toBe('Prepared 16 Nov 2026 by Taha');
    expect(document.fileBaseName).toBe('Pocket-Ledger-export-2026-11-16');
  });

  it('says what each entry did to cash, to parties and to income and expenses', () => {
    const pick = (number: number) => {
      const found = document.entries[number - 1];
      if (!found) throw new Error(`no entry ${number}`);
      return [found.cashChangeMinor, found.partyChangeMinor, found.incomeMinor, found.expenseMinor];
    };
    expect(pick(1)).toEqual([50000, 0, 0, 0]);
    expect(pick(2)).toEqual([200000, 0, 200000, 0]);
    expect(pick(3)).toEqual([-10000, 0, 0, 0]);
    expect(pick(4)).toEqual([0, 0, 0, 0]);
    expect(pick(5)).toEqual([-6000, 6000, 0, 0]);
    expect(pick(6)).toEqual([-3000, 1800, 0, 1200]);
    expect(document.entries[5]).toMatchObject({ receipts: 2, party: 'Ali', account: 'Bank' });
    expect(document.entries[6]).toMatchObject({ currency: 'IQD', cashChangeMinor: -1000 });
  });

  it('writes a journal in which every entry balances in every currency', () => {
    for (const item of document.entries) {
      const lines = document.journal.filter((line) => line.entryId === item.id);
      for (const currency of new Set(lines.map((line) => line.currency))) {
        const net = lines
          .filter((line) => line.currency === currency)
          .reduce((sum, line) => sum + line.debitMinor - line.creditMinor, 0);
        expect(net).toBe(0);
      }
      // Debits are listed before credits.
      const firstCredit = lines.findIndex((line) => line.debitMinor === 0);
      expect(
        lines
          .slice(firstCredit === -1 ? lines.length : firstCredit)
          .every((line) => line.debitMinor === 0),
      ).toBe(true);
    }
    const lines = (id: string) =>
      document.journal
        .filter((line) => line.entryId === id)
        .map(
          (line) =>
            `${line.account} | ${line.accountClass} | ${line.currency} ${line.debitMinor} / ${line.creditMinor}`,
        );
    expect(lines('t-fx')).toEqual([
      'Pocket | Cash & bank | IQD 131000 / 0',
      'Currency exchange | Currency exchange | USD 10000 / 0',
      'Pocket | Cash & bank | USD 0 / 10000',
      'Currency exchange | Currency exchange | IQD 0 / 131000',
    ]);
    expect(lines('t-open')).toEqual([
      'Pocket | Cash & bank | USD 50000 / 0',
      'Opening balances | Opening balances | USD 0 / 50000',
    ]);
    expect(lines('t-adjust')).toEqual([
      'Reconciliation adjustments | Reconciliation | IQD 1000 / 0',
      'Pocket | Cash & bank | IQD 0 / 1000',
    ]);
    expect(lines('t-move')).toHaveLength(2);
  });

  it('summarises balances, parties, categories, months and a trial balance that agrees', () => {
    expect(document.accounts).toEqual([
      { name: 'Pocket', kind: 'Pocket', archived: false, balances: { USD: 54000, IQD: 130000 } },
      { name: 'Bank', kind: 'Bank', archived: false, balances: { USD: 177000 } },
      { name: 'Old wallet', kind: 'Pocket', archived: true, balances: {} },
    ]);
    expect(document.totals).toEqual({
      cash: { USD: 231000, IQD: 130000 },
      receivables: { USD: 7800, IQD: 0 },
      payables: { USD: 0, IQD: 0 },
    });
    expect(document.parties).toEqual([
      {
        name: 'Ali',
        note: 'Colleague',
        dueDate: '2026-12-01',
        archived: false,
        balances: { USD: 7800 },
      },
    ]);
    expect(document.categories).toEqual([
      { name: 'Food & Drink', kind: 'Expense', archived: false, entries: 1, totals: { USD: 1200 } },
      { name: 'Rent', kind: 'Expense', archived: false, entries: 0, totals: {} },
      { name: 'Salary', kind: 'Income', archived: false, entries: 1, totals: { USD: 200000 } },
    ]);
    expect(document.monthly).toEqual([
      { month: '2026-10-01', currency: 'USD', incomeMinor: 200000, expenseMinor: 1200 },
    ]);
    for (const currency of document.currencies) {
      const rows = document.trialBalance.filter((row) => row.currency === currency);
      expect(rows.reduce((sum, row) => sum + row.debitMinor, 0)).toBe(
        rows.reduce((sum, row) => sum + row.creditMinor, 0),
      );
    }
    expect(
      document.trialBalance
        .filter((row) => row.currency === 'USD')
        .map((row) => [row.account, row.debitMinor - row.creditMinor]),
    ).toEqual([
      ['Pocket', 54000],
      ['Bank', 177000],
      ['Ali', 7800],
      ['Income: Salary', -200000],
      ['Expense: Food & Drink', 1200],
      ['Opening balances', -50000],
      ['Currency exchange', 10000],
    ]);
  });

  it('keeps a currency that is no longer in use but still has entries', () => {
    const old = buildLedgerExport({
      ...input(),
      currencies: ['USD', 'EUR'],
    });
    expect(old.currencies).toEqual(['USD', 'EUR', 'IQD']);
  });
});

describe('ledger export files', () => {
  const document = buildLedgerExport(input());

  it('writes a workbook with a sheet per view, filters and real numbers', () => {
    const files = readZip(buildLedgerXlsx(document, lightColors));
    const workbook = files.get('xl/workbook.xml') ?? '';
    const names = [...workbook.matchAll(/<sheet name="([^"]+)"/g)].map((match) => match[1]);
    expect(names).toEqual([
      'Summary',
      'Entries',
      'Journal',
      'Trial balance',
      'Accounts',
      'Parties',
      'Categories',
      'Monthly',
    ]);
    for (let index = 1; index <= names.length; index += 1) {
      expect(files.has(`xl/worksheets/sheet${index}.xml`)).toBe(true);
    }
    expect(workbook).toContain(
      '<definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">\'Entries\'!$A$1:$U$8</definedName>',
    );
    expect(workbook).toContain("'Trial balance'!$1:$1");

    const strings = files.get('xl/sharedStrings.xml') ?? '';
    for (const expected of [
      'Pocket Ledger export',
      'Prepared 16 Nov 2026 by Taha',
      '1 Oct 2026 to 2 Nov 2026',
      'USD, IQD (never added together)',
      'How to read this file',
      'Counts as expense',
      'Food &amp; Drink (split with Ali)',
      'Exchange at 1 USD = 1,310 IQD',
      'Expense: Food &amp; Drink',
      'Total USD',
      'Old wallet (archived)',
    ]) {
      expect(strings).toContain(`>${expected}</t>`);
    }
    // Each note starts a bulleted line; long ones continue on the next rows.
    for (const note of LEDGER_EXPORT_NOTES) {
      const opening = note.split(' ').slice(0, 4).join(' ');
      expect(strings).toContain(`\u2022 ${opening.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}`);
    }
    const noteLines = [...strings.matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)]
      .map((match) => (match[1] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
      .filter((line) => line.startsWith('\u2022 ') || line.startsWith('   '));
    expect(noteLines.length).toBeGreaterThan(LEDGER_EXPORT_NOTES.length);
    expect(Math.max(...noteLines.map((line) => line.length))).toBeLessThanOrEqual(96);

    const entries = files.get('xl/worksheets/sheet2.xml') ?? '';
    expect(entries).toContain('<autoFilter ref="A1:U8"/>');
    expect(entries).toContain('<pane ySplit="1" topLeftCell="A2"');
    // The split expense on row 7: paid 30.00, cash -30.00, receivable +18.00, expense 12.00.
    expect(entries).toMatch(/<c r="J7" s="\d+"><v>30\.00<\/v><\/c>/);
    expect(entries).toMatch(/<c r="K7" s="\d+"><v>-30\.00<\/v><\/c>/);
    expect(entries).toMatch(/<c r="L7" s="\d+"><v>18\.00<\/v><\/c>/);
    expect(entries).toMatch(/<c r="N7" s="\d+"><v>12\.00<\/v><\/c>/);
    // The exchange on row 4 received whole dinars.
    expect(entries).toMatch(/<c r="P4" s="\d+"><v>131000<\/v><\/c>/);
    const styles = files.get('xl/styles.xml') ?? '';
    expect(styles).toContain('formatCode="#,##0.00"');
    expect(styles).toContain('formatCode="#,##0"');
    expect(styles).toContain('formatCode="mmm yyyy"');
  });

  it('adds a Budgets sheet only when there are budgets', () => {
    const files = readZip(buildLedgerXlsx(buildLedgerExport(withBudgets()), lightColors));
    const workbook = files.get('xl/workbook.xml') ?? '';
    const names = [...workbook.matchAll(/<sheet name="([^"]+)"/g)].map((match) => match[1]);
    expect(names.at(-1)).toBe('Budgets');
    const strings = files.get('xl/sharedStrings.xml') ?? '';
    for (const expected of ['Monthly budget', 'Spent in Nov 2026', 'Over budget', 'All expenses']) {
      expect(strings).toContain(`>${expected}</t>`);
    }
    const sheet = files.get(`xl/worksheets/sheet${names.length}.xml`) ?? '';
    // Food & Drink in USD on row 3: budget 10.00, spent 15.00, 5.00 over.
    expect(sheet).toMatch(/<c r="C3" s="\d+"><v>10\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="D3" s="\d+"><v>15\.00<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="E3" s="\d+"><v>-5\.00<\/v><\/c>/);
  });

  it('writes the journal as a CSV any tool can read', () => {
    const rows = buildLedgerCsv(document).replace('\uFEFF', '').trimEnd().split('\r\n');
    expect(rows[0]).toBe(LEDGER_CSV_HEADERS.join(','));
    expect(rows).toHaveLength(document.journal.length + 1);
    expect(rows).toContain(
      '6,2026-10-12,Expense,Food & Drink (split with Ali),Ali,Party,USD,18.00,,Food & Drink,Ali,Team lunch,2,2026-10-12T09:00:00.000Z,t-lunch',
    );
    expect(rows).toContain(
      '3,2026-10-08,Exchange,"Exchange at 1 USD = 1,310 IQD",Pocket,Cash & bank,IQD,131000,,,,,0,2026-10-08T09:00:00.000Z,t-fx',
    );
  });

  it('handles an empty ledger', () => {
    const empty = buildLedgerExport({ ...input(), transactions: [], receiptCounts: new Map() });
    expect(empty.entries).toEqual([]);
    expect(empty.firstDate).toBeNull();
    const files = readZip(buildLedgerXlsx(empty, lightColors));
    expect(files.get('xl/sharedStrings.xml')).toContain('>No entries yet</t>');
    expect(files.get('xl/worksheets/sheet2.xml')).not.toContain('<autoFilter');
    expect(buildLedgerCsv(empty).replace('\uFEFF', '').trim()).toBe(LEDGER_CSV_HEADERS.join(','));
  });
});
