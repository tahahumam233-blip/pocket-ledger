import { describe, expect, it } from '@jest/globals';

import {
  buildStatement,
  debtStanding,
  describeDue,
  describeBalance,
  describeStatementLine,
  type StatementSourceLine,
  statementToCsv,
  statementToText,
  suggestDebtAction,
  summarizeDebts,
} from './debts';

const line = (
  overrides: Partial<StatementSourceLine> & Pick<StatementSourceLine, 'postedDate' | 'amountMinor'>,
): StatementSourceLine => ({
  transactionId: `t-${overrides.postedDate}-${overrides.amountMinor}`,
  createdAt: `${overrides.postedDate}T12:00:00.000Z`,
  kind: 'transfer',
  debtAction: 'lend',
  note: '',
  categoryName: null,
  counterAccountName: 'Pocket',
  ...overrides,
});

describe('debt standing and suggestions', () => {
  it('reads the sign of a person balance', () => {
    expect(debtStanding(500)).toBe('owes_you');
    expect(debtStanding(-1)).toBe('you_owe');
    expect(debtStanding(0)).toBe('settled');
    expect(describeBalance('Ali', 6000, 'USD')).toBe('Ali owes you $60.00');
    expect(describeBalance('Sara', -25000, 'IQD')).toBe('You owe Sara 25,000 IQD');
    expect(describeBalance('Omar', 0, 'USD')).toBe('All settled with Omar');
  });

  it('suggests lending or repaying, borrowing or collecting from the balance', () => {
    expect(suggestDebtAction('gave', 0)).toBe('lend');
    expect(suggestDebtAction('gave', 100)).toBe('lend');
    expect(suggestDebtAction('gave', -100)).toBe('repay');
    expect(suggestDebtAction('got', 100)).toBe('collect');
    expect(suggestDebtAction('got', 0)).toBe('borrow');
    expect(suggestDebtAction('got', -100)).toBe('borrow');
  });

  it('totals what is owed both ways without mixing currencies', () => {
    const totals = summarizeDebts([
      { balances: { USD: 6000, IQD: -50000 } },
      { balances: { USD: -2000 } },
      { balances: { USD: 4000, IQD: 0 } },
    ]);
    expect(totals).toEqual({ owedToYou: { USD: 10000 }, youOwe: { IQD: 50000, USD: 2000 } });
  });
});

describe('statement of account', () => {
  const lines: StatementSourceLine[] = [
    line({ postedDate: '2026-09-20', amountMinor: 5000 }),
    line({ postedDate: '2026-10-02', amountMinor: 10000, note: 'Rent help' }),
    line({
      postedDate: '2026-10-10',
      amountMinor: -4000,
      debtAction: 'collect',
      counterAccountName: 'Bank',
    }),
    line({
      postedDate: '2026-10-15',
      amountMinor: -2500,
      kind: 'expense',
      debtAction: null,
      categoryName: 'Food & Drink',
      counterAccountName: null,
    }),
    line({ postedDate: '2026-11-03', amountMinor: 700 }),
  ];

  it('carries earlier lines into the opening balance and runs the balance', () => {
    const statement = buildStatement(lines, 'USD', { from: '2026-10-01', to: '2026-10-31' });
    expect(statement.openingMinor).toBe(5000);
    expect(statement.entries.map((entry) => entry.balanceMinor)).toEqual([15000, 11000, 8500]);
    expect(statement.totalGaveMinor).toBe(10000);
    expect(statement.totalGotMinor).toBe(6500);
    expect(statement.closingMinor).toBe(8500);
    expect(statement.entries.map((entry) => entry.description)).toEqual([
      'Lent from Pocket',
      'Paid you back into Bank',
      'Paid for you: Food & Drink',
    ]);
  });

  it('covers all time when no range is given and orders by date then entry time', () => {
    const shuffled = [lines[3], lines[0], lines[4], lines[2], lines[1]].filter(
      (item): item is StatementSourceLine => Boolean(item),
    );
    const statement = buildStatement(shuffled, 'USD');
    expect(statement.openingMinor).toBe(0);
    expect(statement.entries.map((entry) => entry.postedDate)).toEqual([
      '2026-09-20',
      '2026-10-02',
      '2026-10-10',
      '2026-10-15',
      '2026-11-03',
    ]);
    expect(statement.closingMinor).toBe(9200);
    expect(statement.closingMinor).toBe(
      statement.entries[statement.entries.length - 1]?.balanceMinor,
    );
  });

  it('describes every kind of entry in plain words', () => {
    const base = line({ postedDate: '2026-10-01', amountMinor: 1 });
    expect(
      describeStatementLine({ ...base, debtAction: 'borrow', counterAccountName: 'Safe' }),
    ).toBe('Borrowed into Safe');
    expect(describeStatementLine({ ...base, debtAction: 'repay', counterAccountName: null })).toBe(
      'You paid back',
    );
    expect(
      describeStatementLine({ ...base, debtAction: null, kind: 'income', categoryName: 'Salary' }),
    ).toBe('Owed to you: Salary');
    expect(describeStatementLine({ ...base, debtAction: null, kind: 'opening' })).toBe(
      'Starting balance',
    );
    expect(describeStatementLine({ ...base, debtAction: null, kind: 'adjustment' })).toBe(
      'Balance correction',
    );
  });

  it('exports as readable text and as CSV with a running balance', () => {
    const statement = buildStatement(lines, 'USD', { from: '2026-10-01', to: '2026-10-31' });
    const text = statementToText(statement, 'Ali', {
      appName: 'Pocket Ledger',
      today: '2026-11-01',
    });
    expect(text).toContain('Statement of account: Ali (USD)');
    expect(text).toContain('Opening balance: Ali owes you $50.00');
    expect(text).toContain('Lent from Pocket (Rent help). You gave $100.00. Balance $150.00');
    expect(text).toContain('Closing balance: Ali owes you $85.00');
    expect(text).toContain('Sent from Pocket Ledger');

    const csv = statementToCsv(statement).replace('﻿', '').trim().split('\r\n');
    expect(csv[0]).toBe('Date,Description,Note,You gave (USD),You got (USD),Balance');
    expect(csv[1]).toBe(',Opening balance,,,,50.00');
    expect(csv[2]).toBe('2026-10-02,Lent from Pocket,Rent help,100.00,,150.00');
    expect(csv[4]).toBe('2026-10-15,Paid for you: Food & Drink,,,25.00,85.00');
    expect(csv[5]).toBe(',Closing balance,,100.00,65.00,85.00');
  });
});

describe('due dates', () => {
  it('describes when a balance should be settled', () => {
    const today = '2026-11-01';
    expect(describeDue(null, today, true)).toBeNull();
    expect(describeDue('2026-11-10', today, false)).toBeNull();
    expect(describeDue('2026-11-01', today, true)).toEqual({ label: 'Due today', overdue: false });
    expect(describeDue('2026-11-02', today, true)).toEqual({
      label: 'Due tomorrow',
      overdue: false,
    });
    expect(describeDue('2026-11-06', today, true)).toEqual({
      label: 'Due in 5 days',
      overdue: false,
    });
    expect(describeDue('2027-01-15', today, true)).toEqual({
      label: 'Due 15 Jan 2027',
      overdue: false,
    });
    expect(describeDue('2026-10-31', today, true)).toEqual({
      label: '1 day overdue',
      overdue: true,
    });
    expect(describeDue('2026-10-20', today, true)).toEqual({
      label: '12 days overdue',
      overdue: true,
    });
  });
});
